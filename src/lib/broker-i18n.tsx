import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type BrokerLanguage = "en" | "ar";

export const BROKER_AR: Record<string, string> = {
  "Broker Recruitment Agency": "وكالة بروكر للاستقدام",
  "Fast Recruitment Agency": "فاست لجلب الأيدي العاملة",
  "Licensed by Ministry of Labour": "مرخصة من وزارة العمل",
  "Home": "الرئيسية", "Available CVs": "السير الذاتية المتاحة", "About": "من نحن", "Contact": "اتصل بنا",
  "Reliable domestic and skilled workers for families and companies in Qatar": "عمالة منزلية ومهنية موثوقة للعائلات والشركات في قطر",
  "We recruit, screen and document workers from the Philippines, Kenya, Ethiopia, Nigeria, Tanzania, Uganda and India — with full Ministry of Labour compliance.": "نقوم بتوظيف وفحص وتوثيق العمال من الفلبين، كينيا، إثيوبيا، نيجيريا، تنزانيا، أوغندا والهند - مع الالتزام الكامل بوزارة العمل.",
  "View available CVs": "عرض السير الذاتية المتاحة", "Talk to us": "تواصل معنا", "Join WhatsApp Group": "انضم لمجموعة واتساب",
  "Fully licensed": "مرخصة بالكامل", "7 source countries": "٧ دول مصدر", "Screened workers": "عمال تم فحصهم",
  "Operating under a Ministry of Labour recruitment licence.": "نعمل بموجب ترخيص استقدام صادر عن وزارة العمل.",
  "Trusted partner agencies across Africa and Asia.": "وكالات شريكة موثوقة في أفريقيا وآسيا.",
  "Verified passports, experience checks and clear CVs.": "جوازات سفر موثقة وخبرات مدققة وسير ذاتية واضحة.",
  "Where our workers come from": "الدول التي يأتي منها عمالنا",
  "Kenya": "كينيا", "Uganda": "أوغندا", "Ethiopia": "إثيوبيا", "Nigeria": "نيجيريا", "Tanzania": "تنزانيا", "Rwanda": "رواندا",
  "Philippines": "الفلبين", "India": "الهند", "Sri Lanka": "سريلانكا", "Nepal": "نيبال", "Bangladesh": "بنغلاديش",
  "Licensed by the Ministry of Labour, State of Qatar. Domestic and skilled worker recruitment.": "مرخصة من وزارة العمل، دولة قطر. استقدام العمالة المنزلية والمهنية.",
  "WhatsApp us": "راسلنا على واتساب", "Office": "المكتب", "WhatsApp": "واتساب", "Call": "اتصال",
  "Broker Recruitment Agency, Al Bustan Building 37, Al Sadd, Doha, 4th floor, 404-A": "وكالة بروكر للاستقدام، مبنى البستان ٣٧، السد، الدوحة، الطابق الرابع، ٤٠٤-A",
  "About us": "من نحن", "How the process works": "خطوات الاستقدام",
  "Broker Recruitment Agency is a manpower recruitment company based in Doha, Qatar, licensed by the Ministry of Labour. We work with families, households and companies to place domestic and skilled workers who are properly documented and prepared for work in Qatar.": "وكالة بروكر للاستقدام شركة لاستقدام العمالة مقرها الدوحة، قطر، ومرخصة من وزارة العمل. نعمل مع العائلات والأسر والشركات لتوفير عمالة منزلية ومهنية موثقة ومستعدة للعمل في قطر.",
  "Every worker we present has been interviewed by our partner agency, has a valid passport, and comes with a clear CV covering experience, languages and skills. We handle the paperwork end to end: visa, medical, POLO or embassy requirements where applicable, contract signing and arrival.": "تُجري وكالتنا الشريكة مقابلة مع كل عامل نقدمه، ويحمل جواز سفر ساريًا وسيرة ذاتية واضحة تشمل الخبرة واللغات والمهارات. نتولى جميع الإجراءات: التأشيرة والفحص الطبي ومتطلبات بولو أو السفارة عند الحاجة وتوقيع العقد والوصول.",
  "Tell us the position, nationality and budget you need.": "أخبرنا بالمهنة والجنسية والميزانية المطلوبة.",
  "We send shortlisted CVs for your review.": "نرسل لك السير الذاتية المختارة لمراجعتها.",
  "You select a worker and we prepare the contract.": "تختار العامل ونُعد العقد.",
  "Visa, medical and travel documents are processed.": "تُستكمل التأشيرة والفحص الطبي ووثائق السفر.",
  "The worker arrives in Qatar and joins your household or company.": "يصل العامل إلى قطر وينضم إلى أسرتك أو شركتك.",
  "Contact us": "اتصل بنا",
  "Send us a message on WhatsApp with the position and nationality you need, and we will reply with available CVs.": "أرسل لنا رسالة على واتساب بالمهنة والجنسية المطلوبة، وسنرد عليك بالسير الذاتية المتاحة.",
  "Recruitment line": "خط الاستقدام", "Email": "البريد الإلكتروني", "Working hours": "ساعات العمل",
  "Saturday – Thursday, 8:00 am – 12:00 pm and 4:00 pm – 8:00 pm": "السبت – الخميس، من ٨:٠٠ صباحًا إلى ١٢:٠٠ ظهرًا ومن ٤:٠٠ مساءً إلى ٨:٠٠ مساءً",
  "Only workers currently available are shown. Reserved workers are removed automatically.": "يُعرض العمال المتاحون حاليًا فقط. يُزال العمال المحجوزون تلقائيًا.",
  "Search name, code, position…": "ابحث بالاسم أو الرمز أو المهنة…", "All countries": "جميع الدول", "worker": "عامل", "workers": "عمال",
  "Loading CVs…": "جارٍ تحميل السير الذاتية…", "Could not load CVs": "تعذر تحميل السير الذاتية",
  "No workers match this search right now. Please contact us and we will send fresh CVs.": "لا يوجد عمال يطابقون هذا البحث حاليًا. يرجى التواصل معنا وسنرسل سيرًا ذاتية جديدة.",
  "Reference": "المرجع", "Country": "الدولة", "Nationality": "الجنسية", "Position": "المهنة", "Experience": "الخبرة", "Age": "العمر",
  "Marital status": "الحالة الاجتماعية", "Children": "الأطفال", "Religion": "الديانة", "Height": "الطول", "Weight": "الوزن", "Education": "التعليم",
  "Languages": "اللغات", "Skills & experience": "المهارات والخبرة", "No photo": "لا توجد صورة", "Close": "إغلاق", "View PDF": "عرض PDF",
  "No overseas experience": "لا توجد خبرة خارج البلاد", "year(s)": "سنة", "in": "في",
  "English": "الإنجليزية", "Arabic": "العربية", "Hindi": "الهندية", "Filipino": "الفلبينية", "Swahili": "السواحيلية",
  "Housemaid": "عاملة منزلية", "Nanny": "مربية أطفال", "Cook": "طاهية", "Driver": "سائق", "Cleaner": "عامل تنظيف", "Caregiver": "مقدم رعاية",
  "Cleaning": "التنظيف", "Cooking": "الطبخ", "Ironing": "الكي", "Laundry": "غسل الملابس", "Childcare": "رعاية الأطفال", "Baby care": "رعاية الرضع", "Elderly care": "رعاية كبار السن",
  "Single": "عزباء", "Married": "متزوجة", "Divorced": "مطلقة", "Widowed": "أرملة", "Christian": "مسيحية", "Muslim": "مسلمة",
  "Other": "أخرى", "Urdu": "الأردية", "Tagalog": "التاغالوغية", "Amharic": "الأمهرية", "French": "الفرنسية",
  "Baby Sitting": "رعاية الأطفال", "Baby Care": "رعاية الرضع", "Elderly Care": "رعاية كبار السن", "Washing": "الغسيل", "Sewing": "الخياطة",
  "Saudi Arabia": "السعودية", "Qatar": "قطر", "Kuwait": "الكويت", "Oman": "عُمان", "Bahrain": "البحرين", "UAE": "الإمارات",
};

const BrokerLanguageContext = createContext<{
  language: BrokerLanguage;
  setLanguage: (language: BrokerLanguage) => void;
}>({ language: "en", setLanguage: () => {} });

export function BrokerLanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<BrokerLanguage>("en");
  useEffect(() => {
    try { if (localStorage.getItem("broker-language") === "ar") setLanguage("ar"); } catch { /* Storage can be unavailable. */ }
  }, []);
  useEffect(() => {
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = language;
    return () => {
      document.documentElement.dir = "ltr";
      document.documentElement.lang = "en";
    };
  }, [language]);
  const chooseLanguage = (next: BrokerLanguage) => {
    setLanguage(next);
    try { localStorage.setItem("broker-language", next); } catch { /* Keep the toggle working without storage. */ }
  };
  return <BrokerLanguageContext.Provider value={{ language, setLanguage: chooseLanguage }}>{children}</BrokerLanguageContext.Provider>;
}

export function useBrokerLanguage() {
  const context = useContext(BrokerLanguageContext);
  return { ...context, t: (text: string) => context.language === "ar" ? BROKER_AR[text] ?? Object.entries(BROKER_AR).find(([key]) => key.toLowerCase() === text.toLowerCase())?.[1] ?? text : text };
}