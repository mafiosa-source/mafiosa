ALTER TABLE public.polo_events ADD COLUMN IF NOT EXISTS corrected_worker_name text;
ALTER TABLE public.bulk_transfers ADD COLUMN IF NOT EXISTS voided_at timestamptz;
ALTER TABLE public.bulk_transfers ADD COLUMN IF NOT EXISTS void_kind text;
ALTER TABLE public.bulk_transfers ADD COLUMN IF NOT EXISTS void_reason text;
ALTER TABLE public.bulk_items ADD COLUMN IF NOT EXISTS reversal_transaction_id text;

CREATE OR REPLACE FUNCTION public.correct_polo_worker_name(p_event_ids uuid[], p_name text) RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE old_rows jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_app_member(auth.uid()) THEN RAISE EXCEPTION 'Not authorized'; END IF;
 IF length(trim(p_name)) = 0 THEN RAISE EXCEPTION 'Worker name is required'; END IF;
 SELECT jsonb_agg(to_jsonb(e)) INTO old_rows FROM public.polo_events e WHERE id = ANY(p_event_ids);
 IF old_rows IS NULL THEN RAISE EXCEPTION 'Submission not found'; END IF;
 UPDATE public.polo_events SET corrected_worker_name = trim(p_name) WHERE id = ANY(p_event_ids);
 INSERT INTO public.action_audit(user_id,action,entity,label,before_data,after_data,module) VALUES(auth.uid(),'update','polo_events','Correct scanned worker name',old_rows,jsonb_build_object('event_ids',p_event_ids,'name',trim(p_name)),'polo');
END $$;
REVOKE ALL ON FUNCTION public.correct_polo_worker_name(uuid[],text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.correct_polo_worker_name(uuid[],text) TO authenticated;

CREATE OR REPLACE FUNCTION public.void_polo_bulk(p_bulk_id uuid, p_action text, p_date date, p_reason text) RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE b public.bulk_transfers%ROWTYPE; i public.bulk_items%ROWTYPE; t public.transactions%ROWTYPE; f public.transactions%ROWTYPE; rid uuid; snapshot jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_app_member(auth.uid()) THEN RAISE EXCEPTION 'Not authorized'; END IF;
 IF p_action NOT IN ('delete','reverse') OR p_date IS NULL OR length(trim(coalesce(p_reason,''))) = 0 THEN RAISE EXCEPTION 'Action, date and reason are required'; END IF;
 SELECT * INTO b FROM public.bulk_transfers WHERE id=p_bulk_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Bulk not found'; END IF;
 IF b.voided_at IS NOT NULL THEN RAISE EXCEPTION 'Bulk already cancelled or reversed'; END IF;
 PERFORM 1 FROM public.bulk_items WHERE bulk_id=b.id FOR UPDATE;
 SELECT jsonb_build_object('bulk',to_jsonb(b),'items',coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb)) INTO snapshot FROM public.bulk_items x WHERE bulk_id=b.id;
 IF p_action='delete' THEN
  IF b.status <> 'pending' OR EXISTS(SELECT 1 FROM public.bulk_items WHERE bulk_id=b.id AND (sign_status <> 'pending' OR transfer_transaction_id IS NOT NULL)) THEN RAISE EXCEPTION 'Signed transfers cannot be deleted; use reversal'; END IF;
 ELSE
  IF NOT EXISTS(SELECT 1 FROM public.bulk_items WHERE bulk_id=b.id AND sign_status='signed') THEN RAISE EXCEPTION 'No signed transfers to reverse'; END IF;
  FOR i IN SELECT * FROM public.bulk_items WHERE bulk_id=b.id AND sign_status='signed' LOOP
   SELECT * INTO t FROM public.transactions WHERE id::text=i.transfer_transaction_id AND deleted_at IS NULL AND status='Completed' FOR UPDATE;
   IF NOT FOUND THEN RAISE EXCEPTION 'Original transfer is missing for %',i.worker_name; END IF;
   IF t.type <> 'Transfer' OR t.from_wallet <> b.from_account OR t.to_wallet <> b.to_account OR t.amount <> i.amount OR t.reference_number IS DISTINCT FROM b.ref OR i.reversal_transaction_id IS NOT NULL THEN RAISE EXCEPTION 'Transfer does not match this bulk'; END IF;
   SELECT * INTO f FROM public.transactions WHERE id::text=i.fee_transaction_id AND deleted_at IS NULL FOR UPDATE;
   IF NOT FOUND OR coalesce(f.current_location,f.to_wallet) <> b.to_account THEN RAISE EXCEPTION 'Fee has moved after signing for %; reconcile it before reversal',i.worker_name; END IF;
   IF EXISTS(SELECT 1 FROM public.transactions later WHERE later.deleted_at IS NULL AND later.status <> 'Cancelled' AND later.purpose_category='POLO' AND later.id <> t.id AND later.id <> f.id AND later.created_at >= t.created_at AND (later.parent_txn_id=t.id OR (t.candidate_id IS NOT NULL AND later.candidate_id=t.candidate_id) OR (t.candidate IS NOT NULL AND lower(trim(later.candidate))=lower(trim(t.candidate))))) THEN RAISE EXCEPTION 'Later fee activity exists for %; reconcile it before reversal',i.worker_name; END IF;
   INSERT INTO public.transactions(user_id,date,type,company,classification,candidate,candidate_id,sponsor,passport,amount,purpose,purpose_category,status,expense_kind,reference_number,description,from_wallet,to_wallet,current_location,parent_txn_id,created_by)
   VALUES(t.user_id,p_date,'Transfer',t.company,t.classification,t.candidate,t.candidate_id,t.sponsor,t.passport,t.amount,'Reversal of bulk '||b.ref,'POLO','Completed','POLO_BULK_REVERSAL',b.ref,trim(p_reason),b.to_account,b.from_account,b.from_account,t.id,auth.uid()::text) RETURNING id INTO rid;
   UPDATE public.transactions SET current_location=b.from_account,updated_at=now(),last_edited_by=auth.uid()::text WHERE id=f.id;
   UPDATE public.bulk_items SET reversal_transaction_id=rid::text WHERE id=i.id;
  END LOOP;
 END IF;
 UPDATE public.bulk_transfers SET voided_at=now(),void_kind=p_action,void_reason=trim(p_reason),updated_at=now() WHERE id=b.id;
 INSERT INTO public.action_audit(user_id,action,entity,entity_id,label,before_data,after_data,module) VALUES(auth.uid(),'update','bulk_transfer',b.id::text,p_action||' bulk '||b.ref,snapshot,jsonb_build_object('action',p_action,'date',p_date,'reason',trim(p_reason)),'polo');
END $$;
REVOKE ALL ON FUNCTION public.void_polo_bulk(uuid,text,date,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.void_polo_bulk(uuid,text,date,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.sign_polo_bulk_item(p_bulk_id uuid,p_item_id uuid,p_date date,p_proof text) RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE b public.bulk_transfers%ROWTYPE; i public.bulk_items%ROWTYPE; f public.transactions%ROWTYPE; tid uuid;
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_app_member(auth.uid()) THEN RAISE EXCEPTION 'Not authorized'; END IF;
 SELECT * INTO b FROM public.bulk_transfers WHERE id=p_bulk_id FOR UPDATE;
 IF NOT FOUND OR b.voided_at IS NOT NULL OR b.status <> 'pending' THEN RAISE EXCEPTION 'Bulk is no longer pending'; END IF;
 SELECT * INTO i FROM public.bulk_items WHERE id=p_item_id AND bulk_id=b.id FOR UPDATE;
 IF NOT FOUND OR i.sign_status <> 'pending' OR i.transfer_transaction_id IS NOT NULL THEN RAISE EXCEPTION 'Item already signed or unavailable'; END IF;
 SELECT * INTO f FROM public.transactions WHERE id::text=i.fee_transaction_id AND deleted_at IS NULL AND status <> 'Cancelled' FOR UPDATE;
 IF NOT FOUND OR coalesce(f.current_location,f.to_wallet) <> b.from_account OR f.amount <> i.amount THEN RAISE EXCEPTION 'Fee is no longer in the source account'; END IF;
 INSERT INTO public.transactions(user_id,date,type,classification,candidate,candidate_id,sponsor,passport,amount,purpose,purpose_category,status,expense_kind,reference_number,description,from_wallet,to_wallet,current_location,created_by)
 VALUES(f.user_id,p_date,'Transfer',coalesce(f.classification,'Sponsor Expense'),f.candidate,f.candidate_id,f.sponsor,f.passport,i.amount,'POLO fee moved to holding wallet ('||b.ref||')','POLO','Completed','POLO_TO_WALLET',b.ref,'Bulk '||b.ref||' signed in',b.from_account,b.to_account,b.to_account,auth.uid()::text) RETURNING id INTO tid;
 UPDATE public.transactions SET current_location=b.to_account,updated_at=now(),last_edited_by=auth.uid()::text WHERE id=f.id;
 UPDATE public.bulk_items SET sign_status='signed',proof=p_proof,sign_date=p_date,signed_by=auth.uid()::text,transfer_transaction_id=tid::text WHERE id=i.id;
 IF NOT EXISTS(SELECT 1 FROM public.bulk_items WHERE bulk_id=b.id AND sign_status <> 'signed') THEN UPDATE public.bulk_transfers SET status='completed',updated_at=now() WHERE id=b.id; END IF;
 INSERT INTO public.action_audit(user_id,action,entity,entity_id,label,before_data,after_data,module) VALUES(auth.uid(),'update','bulk_item',i.id::text,'Sign bulk '||b.ref,to_jsonb(i),jsonb_build_object('transfer_id',tid),'polo');
END $$;
REVOKE ALL ON FUNCTION public.sign_polo_bulk_item(uuid,uuid,date,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sign_polo_bulk_item(uuid,uuid,date,text) TO authenticated;