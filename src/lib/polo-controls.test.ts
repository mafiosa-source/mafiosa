/// <reference types="bun" />
import { test, expect } from "bun:test";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";

async function fixture() {
  const db = new PGlite();
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT '00000000-0000-0000-0000-000000000001'::uuid $$;
    CREATE FUNCTION public.is_app_member(uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT true $$;
    CREATE TABLE polo_events(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),worker_name text);
    CREATE TABLE bulk_transfers(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),ref text,status text,from_account text,to_account text);
    CREATE TABLE bulk_items(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),bulk_id uuid,fee_transaction_id text,worker_name text,amount numeric,sign_status text,transfer_transaction_id text,proof text,sign_date date,signed_by text);
    CREATE TABLE transactions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid,date date,type text,company text,classification text,candidate text,candidate_id uuid,sponsor text,passport text,amount numeric,purpose text,purpose_category text,status text,expense_kind text,reference_number text,description text,from_wallet text,to_wallet text,current_location text,parent_txn_id uuid,created_by text,created_at timestamptz DEFAULT clock_timestamp(),updated_at timestamptz,deleted_at timestamptz,last_edited_by text);
    CREATE TABLE action_audit(user_id uuid,action text,entity text,entity_id text,label text,before_data jsonb,after_data jsonb,module text);
    ALTER TABLE bulk_transfers ADD COLUMN updated_at timestamptz;
  `);
  await db.exec(readFileSync("drizzle/migrations/0026_polo_corrections_and_safe_bulk_controls.sql", "utf8"));
  const { rows } = await db.query<{id:string}>(`INSERT INTO bulk_transfers(ref,status,from_account,to_account) VALUES('FAST-BULK-001','pending','fast-acct','housemaid-holding') RETURNING id`);
  const bulk = rows[0]?.id;
  if (!bulk) throw new Error("Missing fixture");
  const feeResult = await db.query<{id:string}>(`INSERT INTO transactions(user_id,date,type,candidate,amount,purpose_category,status,to_wallet,current_location) VALUES(auth.uid(),'2026-11-02','Receipt Voucher','Test Worker',160,'POLO','Completed','fast-acct','fast-acct') RETURNING id`);
  const fee=feeResult.rows[0]?.id;
  const itemResult=await db.query<{id:string}>(`INSERT INTO bulk_items(bulk_id,fee_transaction_id,worker_name,amount,sign_status) VALUES($1,$2,'Test Worker',160,'pending') RETURNING id`,[bulk,fee]);
  const item=itemResult.rows[0]?.id;
  return {db,bulk,fee,item};
}

test("name correction preserves original scanned name", async () => {
  const {db}=await fixture();
  const {rows}=await db.query<{id:string}>("INSERT INTO polo_events(worker_name) VALUES('Mary An') RETURNING id");
  await db.query("SELECT correct_polo_worker_name(ARRAY[$1::uuid], 'Mary Ann')",[rows[0]?.id]);
  expect((await db.query("SELECT worker_name,corrected_worker_name FROM polo_events")).rows).toEqual([{worker_name:"Mary An",corrected_worker_name:"Mary Ann"}]);
  await db.close();
});

test("unsigned deletion cancels bulk without moving or deleting money", async () => {
  const {db,bulk}=await fixture();
  await db.query("SELECT void_polo_bulk($1,'delete','2026-11-02','Mistake')",[bulk]);
  expect((await db.query("SELECT void_kind FROM bulk_transfers")).rows).toEqual([{void_kind:"delete"}]);
  expect((await db.query("SELECT count(*)::int AS n FROM transactions")).rows).toEqual([{n:1}]);
  await db.close();
});

test("signed bulk reversal restores 160 to FAST and preserves original signed transfer", async () => {
  const {db,bulk,item}=await fixture();
  await db.query("SELECT sign_polo_bulk_item($1,$2,'2026-11-02','proof')",[bulk,item]);
  await expect(db.query("SELECT void_polo_bulk($1,'delete','2026-11-02','Mistake')",[bulk])).rejects.toThrow("Signed transfers cannot be deleted");
  await db.query("SELECT void_polo_bulk($1,'reverse','2026-11-02','Mistake')",[bulk]);
  expect((await db.query("SELECT from_wallet,to_wallet,amount::int FROM transactions WHERE expense_kind='POLO_BULK_REVERSAL'")).rows).toEqual([{from_wallet:"housemaid-holding",to_wallet:"fast-acct",amount:160}]);
  expect((await db.query("SELECT sign_status,proof FROM bulk_items")).rows).toEqual([{sign_status:"signed",proof:"proof"}]);
  expect((await db.query("SELECT count(*)::int AS n FROM transactions")).rows).toEqual([{n:3}]);
  await expect(db.query("SELECT void_polo_bulk($1,'reverse','2026-11-02','Again')",[bulk])).rejects.toThrow("already cancelled or reversed");
  await db.close();
});

test("later fee movement blocks reversal without partial transfers", async () => {
  const {db,bulk,item}=await fixture();
  await db.query("SELECT sign_polo_bulk_item($1,$2,'2026-11-02','proof')",[bulk,item]);
  await db.exec("INSERT INTO transactions(candidate,purpose_category,status) VALUES('Test Worker','POLO','Completed')");
  await expect(db.query("SELECT void_polo_bulk($1,'reverse','2026-11-02','Mistake')",[bulk])).rejects.toThrow("Later fee activity exists");
  expect((await db.query("SELECT count(*)::int AS n FROM transactions WHERE expense_kind='POLO_BULK_REVERSAL'")).rows).toEqual([{n:0}]);
  await db.close();
});