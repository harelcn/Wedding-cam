# POV

אתר לאלבום משותף לאירועים: כל אחד יוצר תיקייה, משתף אותה ב-QR, וכל מי שמצטרף מצלם ומעלה תמונות/סרטונים שמסתנכרנים בזמן אמת לכולם. ללא התחברות, ללא אפשרות מחיקה.

## הרצה מקומית

1. `npm install`
2. העתק `.env.example` ל-`.env.local` ומלא את הערכים (ראה "הקמת שירותים" למטה)
3. `npm run dev` — האתר יעלה על `http://localhost:5173`
4. להרצת בדיקות: `npm test`

> **שים לב:** אם `VITE_SUPABASE_URL` או `VITE_SUPABASE_ANON_KEY` חסרים או שגויים, האתר לא יעלה בכלל ויוצג מסך לבן ריק (זו התנהגות מכוונת - כשל מהיר עם שגיאה ב-console, במקום כשל שקט מאוחר יותר). אם אתה רואה מסך לבן, בדוק קודם את `.env.local`.

## הקמת שירותים

### Supabase (מסד נתונים + סנכרון בזמן אמת)
1. צור פרויקט חדש ב-supabase.com
2. ב-SQL editor, הרץ את התוכן של `supabase/schema.sql`
3. ב-Project Settings → API, העתק את ה-Project URL ל-`VITE_SUPABASE_URL` ואת ה-anon public key ל-`VITE_SUPABASE_ANON_KEY`

### Cloudflare R2 (אחסון קבצים)
1. צור bucket חדש ב-dash.cloudflare.com → R2
2. הפעל גישה ציבורית לקריאה (r2.dev subdomain או דומיין מותאם) והכנס את הכתובת ל-`VITE_R2_PUBLIC_BASE_URL`
3. צור API token עם הרשאות Object Read & Write, והכנס את הפרטים ל-`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`

### Vercel (הרצה בפרודקשן)
1. חבר את ה-repo הזה לפרויקט חדש ב-Vercel
2. הגדר את כל משתני הסביבה מ-`.env.example` בהגדרות הפרויקט ב-Vercel (Environment Variables)
3. כל push ל-branch הראשי יעלה גרסה חדשה אוטומטית

`vercel.json` כבר מגדיר rewrite שמנתב כל כתובת (חוץ מ-`/api/*`) ל-`index.html`, כדי שקישורי הצטרפות (`/join/<id>`) וכל שאר הנתיבים יעבדו גם בכניסה ישירה (למשל סריקת QR עם מצלמת הטלפון), לא רק בניווט פנימי באתר.
