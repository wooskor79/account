# -*- coding: utf-8 -*-
"""
???? ?? ??? ?? ?? ? DB(MariaDB) ?????? ????
1. PDF ??(?? ??? ? ???? ????) ?? ??/??/?? ?? ??
2. excels/*.xlsx 8? ?? ?? ?? ?? ? ??
3. account.sql (?? ??? + quiz_questions ??? + ?? 1,484?? INSERT ??) ??
4. data/quiz_cache/*.json ??? ?? ?? ??
"""

import os
import re
import json
import glob
import openpyxl
import pdfplumber

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EXCELS_DIR = os.path.join(BASE_DIR, 'excels')
PDF_DIR = os.path.join(BASE_DIR, 'PDF')
DATA_CACHE_DIR = os.path.join(BASE_DIR, 'data', 'quiz_cache')
SQL_FILE = os.path.join(BASE_DIR, 'account.sql')

os.makedirs(DATA_CACHE_DIR, exist_ok=True)

CIRC_MAP = {'?': 1, '?': 2, '?': 3, '?': 4, '1': 1, '2': 2, '3': 3, '4': 4}

def clean_text(text):
    if not text:
        return ''
    t = str(text)
    t = re.sub(r'PERFECT\s*????\s*[12]\s*?\s*???.*?(?=\n|$)', '', t, flags=re.IGNORECASE)
    t = re.sub(r'PART\s*0[123]\s*\|.*?(?=\n|$)', '', t, flags=re.IGNORECASE)
    t = re.sub(r'\[?\d+?\s*????[12]?\s*????\].*?(?=\n|$)', '', t)
    t = re.sub(r'\d+/\d+\s*\(??\s*??\)', '', t)
    t = re.sub(r'www\.bobook\.co\.kr.*?(?=\n|$)', '', t)
    t = re.sub(r'[ \t]+', ' ', t)
    t = re.sub(r'\n{3,}', '\n\n', t)
    return t.strip()

def extract_1grade_book_theory_pdf():
    pdf_path = os.path.join(PDF_DIR, '2026PERFECT????1? ???_9?1? ??.pdf')
    if not os.path.exists(pdf_path):
        print(f'[??] 1? ?? PDF ?? ??: {pdf_path}')
        return {}

    pages_to_check = list(range(84, 91)) + list(range(127, 131)) + list(range(164, 167))
    pdf_answers = {}
    current_section = ''

    with pdfplumber.open(pdf_path) as pdf:
        for pno in pages_to_check:
            page = pdf.pages[pno-1]
            tables = page.extract_tables()
            for t in tables:
                for row in t:
                    if not row or len(row) < 4:
                        continue
                    sec_raw, qno_raw, ans_raw, exp_raw = row[0], row[1], row[2], row[3]
                    if qno_raw in ['NO', None] and ans_raw in ['??', None]:
                        continue
                    if sec_raw:
                        current_section = re.sub(r'[\s\n]+', '', sec_raw)
                    if qno_raw and str(qno_raw).strip().isdigit():
                        qno = int(str(qno_raw).strip())
                        ans_str = str(ans_raw or '').strip()
                        ans_val = CIRC_MAP.get(ans_str, None)
                        exp_clean = clean_text(str(exp_raw or ''))
                        pdf_answers[(current_section, qno)] = (ans_val, exp_clean)

    print(f'[1? ?? ??] PDF?? {len(pdf_answers)}? ??/?? ?? ?? ??')
    return pdf_answers

JOURNAL_FIXES_1GRADE_EXAM = {
    8: {
        'debit': [{'account': '???????(?)', 'amount': 710000}],
        'credit': [{'account': '??????', 'amount': 110000}, {'account': '??', 'amount': 600000}],
        'exp': '[??????] ??:14.??, ????:1,100,000?, ???:110,000?, ??:??\n(?) ???????(?) 710,000? (?) ?????? 110,000?, ?? 600,000? (?? 8. ????? ???)\n? ??? ?? 1,100,000?? ????? ?? ??? ??(??: ??????? 700,000?, ??: ?????? 100,000?, ?? 600,000?)? ???? ???.'
    },
    10: {
        'debit': [{'account': '?????(?)', 'amount': 250000}, {'account': '??????', 'amount': 25000}],
        'credit': [{'account': '??', 'amount': 275000}],
        'exp': '[??????] ??:61.??, ????:250,000?, ???:25,000?, ???:??? ???, ??:?? ?? ??\n(?) ?????(?) 250,000?, ?????? 25,000? (?) ?? 275,000?\n?? (????) ?????(?) 250,000?, ?????? 25,000?'
    },
    12: {
        'debit': [{'account': '????(???)', 'amount': 110000000}],
        'credit': [{'account': '????', 'amount': 110000000}],
        'exp': '[??????] ??:54.??, ????:100,000,000?, ???:10,000,000?, ????:???, ??:?, ??:??\n?????: ???? ?? ?? ?? ??\n(?) ????(???) 110,000,000? (?) ???? 110,000,000?'
    },
    13: {
        'debit': [{'account': '????', 'amount': 11000000}],
        'credit': [{'account': '???(?????)', 'amount': 11000000}],
        'exp': '[??????] 2025.07.29.\n(?) ???? 11,000,000? (?) ???(120)(?????) 11,000,000?'
    },
    14: {
        'debit': [{'account': '?????(??????)', 'amount': 630000}, {'account': '????', 'amount': 55000}],
        'credit': [{'account': '????', 'amount': 685000}],
        'exp': '[??????] 2025.08.31.\n(?) ?????(??????) 630,000?, ????(951) 55,000? (?) ???? 685,000?'
    },
    18: {
        'debit': [{'account': '????', 'amount': 1100000}],
        'credit': [{'account': '?????', 'amount': 1100000}],
        'exp': '[??????] 2025.12.15.\n(?) ???? 1,100,000? (?) ?????(121) 1,100,000?'
    },
    24: {
        'debit': [{'account': '????(???)', 'amount': 550000}],
        'credit': [{'account': '????', 'amount': 500000}, {'account': '???', 'amount': 50000}],
        'exp': '[??????] (?) ????(???) 550,000? (?) ???? 500,000?, ??? 50,000?'
    },
    26: {
        'debit': [{'account': '?????', 'amount': 10000000}],
        'credit': [{'account': '????(???)', 'amount': 10000000}],
        'exp': '[??????] 2025.08.01.\n(?) ?????(111) 10,000,000? (?) ????(110)(???) 10,000,000?'
    },
    33: {
        'debit': [{'account': '???', 'amount': 11000000}, {'account': '???????', 'amount': 60000000}],
        'credit': [{'account': '????', 'amount': 70000000}, {'account': '??????', 'amount': 1000000}],
        'exp': '[??????] ??:11.??, ????:10,000,000?, ???:1,000,000?, ????:?????, ??:??\n(?) ??? 11,000,000?, ???????(207) 60,000,000? (?) ???? 70,000,000?, ?????? 1,000,000?'
    },
    36: {
        'debit': [{'account': '?????', 'amount': 55000000}],
        'credit': [{'account': '????', 'amount': 50000000}, {'account': '??????', 'amount': 5000000}],
        'exp': '[??????] ??:11.??, ????:50,000,000?, ???:5,000,000?, ????:?????, ??:?, ??:?? ?? ??\n(?) ????? 55,000,000? (?) ?????? 5,000,000?, ???? 50,000,000?'
    },
    42: {
        'debit': [{'account': '????', 'amount': 15000000}],
        'credit': [{'account': '?????(109)', 'amount': 15000000}],
        'exp': '[??????] (?) ???? 15,000,000? (?) ?????(109) 15,000,000?'
    },
    44: {
        'debit': [{'account': '?????', 'amount': 100000}, {'account': '??????', 'amount': 10000}],
        'credit': [{'account': '??', 'amount': 110000}],
        'exp': '[??????] (?) ????? 100,000?, ?????? 10,000? (?) ?? 110,000?'
    },
    48: {
        'debit': [{'account': '????', 'amount': 100000}, {'account': '??????', 'amount': 10000}],
        'credit': [{'account': '????', 'amount': 110000}],
        'exp': '[??????] (?) ???? 100,000?, ?????? 10,000? (?) ???? 110,000?'
    },
    49: {
        'debit': [{'account': '????', 'amount': 35000000}],
        'credit': [{'account': '??????', 'amount': 30000000}, {'account': '??????????', 'amount': 5000000}],
        'exp': '[??????] 2025.07.26.\n(?) ???? 35,000,000? (?) ?????? 30,000,000?, ?????????? 5,000,000?'
    },
    50: {
        'debit': [{'account': '???(153)', 'amount': 7000000}],
        'credit': [{'account': '?????', 'amount': 7000000}],
        'exp': '[??????] (?) ??? 7,000,000? (?) ????? 7,000,000?'
    },
    52: {
        'debit': [{'account': '????', 'amount': 2500000}],
        'credit': [{'account': '???', 'amount': 1500000}, {'account': '?????', 'amount': 1000000}],
        'exp': '[??????] (?) ???? 2,500,000? (?) ??? 1,500,000?, ????? 1,000,000?'
    },
    60: {
        'debit': [{'account': '?????(????)', 'amount': 1320000}],
        'credit': [{'account': '????', 'amount': 1200000}, {'account': '??????', 'amount': 120000}],
        'exp': '[??????] ??:17.??, ????:1,200,000?, ???:120,000?, ????:????, ??:?? ?? ??\n(?) ?????(????) 1,320,000? (?) ???? 1,200,000?, ?????? 120,000?'
    },
    61: {
        'debit': [{'account': '????', 'amount': 6200000}],
        'credit': [{'account': '?????(109)', 'amount': 6200000}],
        'exp': '[??????] 2025.07.31.\n(?) ???? 6,200,000? (?) ?????(109) 6,200,000?'
    },
    62: {
        'debit': [{'account': '???', 'amount': 8000000}],
        'credit': [{'account': '??', 'amount': 8000000}],
        'exp': '[??????] 2025.08.29.\n(?) ??? 8,000,000? (?) ?? 8,000,000? (?? 8. ????? ???)'
    },
    65: {
        'debit': [{'account': '??????(178)', 'amount': 3060000}],
        'credit': [{'account': '????', 'amount': 3060000}],
        'exp': '[??????] 2025.11.15.\n(?) ??????(178) 3,060,000? (?) ???? 3,060,000?'
    },
    72: {
        'debit': [{'account': '?????', 'amount': 3300000}],
        'credit': [{'account': '??????', 'amount': 300000}, {'account': '????', 'amount': 3000000}],
        'exp': '[??????] ??:11.??, ????:3,000,000?, ???:300,000?, ????:?????, ??:?, ??:?? ?? ??\n2025.12.15. (?) ????? 3,300,000? (?) ?????? 300,000?, ???? 3,000,000?'
    },
    73: {
        'debit': [{'account': '?????(?????)', 'amount': 10000000}],
        'credit': [{'account': '???(?????)', 'amount': 4000000}, {'account': '????', 'amount': 6000000}],
        'exp': '[??????] 2025.07.10.\n(?) ?????(?????) 10,000,000? (?) ???(?????) 4,000,000?, ???? 6,000,000?'
    },
    78: {
        'debit': [{'account': '??????', 'amount': 12100000}, {'account': '?????', 'amount': 30000}],
        'credit': [{'account': '????', 'amount': 12130000}],
        'exp': '[??????] 2025.12.23.\n(?) ?????? 12,100,000?, ?????(984) 30,000? (?) ???? 12,130,000?'
    },
    80: {
        'debit': [{'account': '????', 'amount': 3000000}, {'account': '??????', 'amount': 30000}],
        'credit': [{'account': '????', 'amount': 3300000}],
        'exp': '[??????] ??:51.??, ????:3,000,000?, ???:300,000?, ????:?????, ??:?, ??:??\n(?) ???? 3,000,000?, ?????? 300,000? (?) ???? 3,300,000?'
    },
    81: {
        'debit': [{'account': '???', 'amount': 30000}, {'account': '??????', 'amount': 3000}],
        'credit': [{'account': '??', 'amount': 33000}],
        'exp': '[??????] ??:61.??, ????:30,000?, ???:3,000?, ????:?????, ??:?? ?? ??\n(?) ??? 30,000?, ?????? 3,000? (?) ?? 33,000?'
    },
    84: {
        'debit': [{'account': '?????', 'amount': 18700000}],
        'credit': [{'account': '????', 'amount': 18700000}],
        'exp': '[??????] ??:54.??, ????:17,000,000?, ???:1,700,000?, ????:?????, ??:?, ??:??\n(?) ????? 18,700,000? (?) ???? 18,700,000?'
    },
    87: {
        'debit': [{'account': '????', 'amount': 9500000}, {'account': '????????', 'amount': 500000}],
        'credit': [{'account': '???', 'amount': 10000000}],
        'exp': '[??????] 2026.08.20.\n(?) ???? 9,500,000?, ???????? 500,000? (?) ??? 10,000,000?'
    },
    96: {
        'debit': [{'account': '????', 'amount': 8000000}, {'account': '???', 'amount': 3000000}],
        'credit': [{'account': '????', 'amount': 10000000}, {'account': '??????', 'amount': 1000000}],
        'exp': '[??????] ??:11.??, ????:10,000,000?, ???:1,000,000?, ????:???, ??:?, ??:??\n2026.12.12. (?) ???? 8,000,000?, ??? 3,000,000? (?) ???? 10,000,000?, ?????? 1,000,000?'
    },
    97: {
        'debit': [{'account': '????', 'amount': 12000000}],
        'credit': [{'account': '??', 'amount': 12000000}],
        'exp': '[??????] 2026.07.11.\n(?) ???? 12,000,000? (?) ?? 12,000,000? (?? 8. ????? ???)'
    },
    99: {
        'debit': [{'account': '??????(178)', 'amount': 3600000}],
        'credit': [{'account': '????', 'amount': 3600000}],
        'exp': '[??????] 2026.08.30.\n(?) ??????(178) 3,600,000? (?) ???? 3,600,000?'
    },
    102: {
        'debit': [{'account': '???(???)', 'amount': 500000}],
        'credit': [{'account': '??', 'amount': 500000}],
        'exp': '[??????] 2026.12.13.\n(?) ???(???) 500,000? (?) ?? 500,000?'
    },
    105: {
        'debit': [{'account': '??', 'amount': 33000}],
        'credit': [{'account': '????', 'amount': 30000}, {'account': '??????', 'amount': 3000}],
        'exp': '[??????] ??:14.?? ?? 22.??, ????:30,000?, ???:3,000?, ??:?? ?? ??\n2026.08.22. (?) ?? 33,000? (?) ???? 30,000?, ?????? 3,000?'
    },
    108: {
        'debit': [{'account': '???????(?)', 'amount': 990000}],
        'credit': [{'account': '????', 'amount': 990000}],
        'exp': '[??????] ??:54.??, ????:900,000?, ???:90,000?, ????:???????, ??:?, ??:??\n2026.12.24. (?) ???????(?) 990,000? (?) ???? 990,000?'
    },
    111: {
        'debit': [{'account': '??', 'amount': 50000000}],
        'credit': [{'account': '?????(???)', 'amount': 50000000}],
        'exp': '[??????] 2026.09.28.\n(?) ?? 50,000,000? (?) ?????(???) 50,000,000?'
    },
    113: {
        'debit': [{'account': '??????', 'amount': 4500000}, {'account': '?????', 'amount': 15000}],
        'credit': [{'account': '????', 'amount': 4515000}],
        'exp': '[??????] 2026.10.22.\n(?) ?????? 4,500,000?, ?????(984) 15,000? (?) ???? 4,515,000?'
    }
}

TAG_TO_PDF_SECTION = {
    '??? ??? ????': '??????????',
    '????': '????',
    '????': '????',
    '????? ????': ('????', '????', 6),
    '????? ???????': '????????????',
    '????? ?????': '??',
    '??': '??',
    '??? ??': '?????',
    '????? ?? ? ??': '????????????',
    '??? ??': '?????',
    '??? ????': '???????',
    '??? ????': '???????',
    '????? ???? ? ????': ('??????????', '????', 7),
    '???? ??': '??????',
    '?????? ????': '??????????',
    '????? ????': '?????????/????????????'
}

def process_all_files():
    pdf_answers_1book = extract_1grade_book_theory_pdf()
    all_processed_questions = []
    
    excel_files = sorted(glob.glob(os.path.join(EXCELS_DIR, '*.xlsx')))
    print(f'\n[?? ?? ?? ? ?? ??] ? {len(excel_files)}? ??')
    
    for fpath in excel_files:
        fname = os.path.basename(fpath)
        print(f'\n--> ?? ?: {fname}')
        
        grade = 'grade1' if '1?' in fname else 'grade2'
        category = '????' if '??' in fname else '?????'
        qtype = 'journal' if '??' in fname else 'theory'
        
        wb = openpyxl.load_workbook(fpath)
        ws_prob = wb['??']
        ws_ans = wb['?????']
        
        probs = {}
        for r in range(2, ws_prob.max_row + 1):
            qno_val = ws_prob.cell(r, 1).value
            if qno_val is None:
                continue
            try:
                qno = int(qno_val)
            except:
                continue
                
            qtext = clean_text(ws_prob.cell(r, 2).value)
            diff = clean_text(ws_prob.cell(r, 7 if qtype == 'theory' else 3).value) or '??'
            cat = clean_text(ws_prob.cell(r, 8 if qtype == 'theory' else 4).value) or ('??' if qtype == 'journal' else '??')
            
            choices = []
            if qtype == 'theory':
                for c_col in range(3, 7):
                    c_val = clean_text(ws_prob.cell(r, c_col).value)
                    choices.append(c_val)
            
            tag_m = re.match(r'\[(.*?)\]', qtext)
            tag_key = tag_m.group(1).strip() if tag_m else f'q_{qno}'
            
            probs[qno] = {
                'question_no': qno,
                'tag_key': tag_key,
                'question': qtext,
                'difficulty': diff,
                'subject_category': cat,
                'choices': choices
            }
            
            ws_prob.cell(r, 2, qtext)
            if qtype == 'theory':
                for idx, c_val in enumerate(choices):
                    ws_prob.cell(r, 3 + idx, c_val)
        
        file_questions = []
        for r in range(2, ws_ans.max_row + 1):
            qno_val = ws_ans.cell(r, 1).value
            if qno_val is None:
                continue
            try:
                qno = int(qno_val)
            except:
                continue
            
            prob_info = probs.get(qno)
            if not prob_info:
                continue
                
            tag_key = prob_info['tag_key']
            
            if qtype == 'theory':
                ans_raw = ws_ans.cell(r, 2).value
                exp_raw = ws_ans.cell(r, 3).value
                ans_num = CIRC_MAP.get(str(ans_raw).strip(), None)
                exp_text = clean_text(exp_raw)
                
                if fname == '1?_?????_??.xlsx':
                    parts = tag_key.split('#')
                    sec_name = parts[0].strip()
                    sub_qno = int(parts[1].strip()) if len(parts) > 1 and parts[1].strip().isdigit() else qno
                    
                    pdf_sec_rule = TAG_TO_PDF_SECTION.get(sec_name)
                    pdf_key = None
                    if isinstance(pdf_sec_rule, str):
                        pdf_key = (pdf_sec_rule, sub_qno)
                    elif isinstance(pdf_sec_rule, tuple):
                        sec1, sec2, split_idx = pdf_sec_rule
                        if sub_qno <= split_idx:
                            pdf_key = (sec1, sub_qno)
                        else:
                            pdf_key = (sec2, sub_qno - split_idx)
                    
                    if pdf_key and pdf_key in pdf_answers_1book:
                        p_ans, p_exp = pdf_answers_1book[pdf_key]
                        if p_ans is not None:
                            ans_num = p_ans
                        if p_exp:
                            exp_text = p_exp
                
                ws_ans.cell(r, 2, ans_num if ans_num else ans_raw)
                ws_ans.cell(r, 3, exp_text)
                
                file_questions.append({
                    'grade': grade,
                    'category': category,
                    'type': qtype,
                    'file_key': fname,
                    'question_no': qno,
                    'tag_key': tag_key,
                    'question': prob_info['question'],
                    'difficulty': prob_info['difficulty'],
                    'subject_category': prob_info['subject_category'],
                    'option_1': prob_info['choices'][0] if len(prob_info['choices']) > 0 else '',
                    'option_2': prob_info['choices'][1] if len(prob_info['choices']) > 1 else '',
                    'option_3': prob_info['choices'][2] if len(prob_info['choices']) > 2 else '',
                    'option_4': prob_info['choices'][3] if len(prob_info['choices']) > 3 else '',
                    'correct_option': ans_num if ans_num else 1,
                    'journal_debit': None,
                    'journal_credit': None,
                    'explanation': exp_text,
                    'is_verified': 1
                })
                
            elif qtype == 'journal':
                d_acc = clean_text(ws_ans.cell(r, 2).value)
                d_amt = clean_text(ws_ans.cell(r, 3).value)
                c_acc = clean_text(ws_ans.cell(r, 4).value)
                c_amt = clean_text(ws_ans.cell(r, 5).value)
                exp_text = clean_text(ws_ans.cell(r, 6).value)
                
                debit_entries = []
                credit_entries = []
                
                if fname == '1?_????_??.xlsx' and qno in JOURNAL_FIXES_1GRADE_EXAM:
                    fix = JOURNAL_FIXES_1GRADE_EXAM[qno]
                    debit_entries = fix['debit']
                    credit_entries = fix['credit']
                    exp_text = fix['exp']
                    
                    ws_ans.cell(r, 2, '\n'.join([e['account'] for e in debit_entries]))
                    ws_ans.cell(r, 3, '\n'.join([str(e['amount']) for e in debit_entries]))
                    ws_ans.cell(r, 4, '\n'.join([e['account'] for e in credit_entries]))
                    ws_ans.cell(r, 5, '\n'.join([str(e['amount']) for e in credit_entries]))
                    ws_ans.cell(r, 6, exp_text)
                else:
                    d_acc_list = [a.strip() for a in d_acc.split('\n') if a.strip()]
                    d_amt_list = [re.sub(r'[^\d]', '', a) for a in d_amt.split('\n') if re.sub(r'[^\d]', '', a)]
                    c_acc_list = [a.strip() for a in c_acc.split('\n') if a.strip()]
                    c_amt_list = [re.sub(r'[^\d]', '', a) for a in c_amt.split('\n') if re.sub(r'[^\d]', '', a)]
                    
                    for idx, acc in enumerate(d_acc_list):
                        amt = int(d_amt_list[idx]) if idx < len(d_amt_list) else 0
                        debit_entries.append({'account': acc, 'amount': amt})
                    for idx, acc in enumerate(c_acc_list):
                        amt = int(c_amt_list[idx]) if idx < len(c_amt_list) else 0
                        credit_entries.append({'account': acc, 'amount': amt})
                    
                    ws_ans.cell(r, 2, d_acc)
                    ws_ans.cell(r, 3, d_amt)
                    ws_ans.cell(r, 4, c_acc)
                    ws_ans.cell(r, 5, c_amt)
                    ws_ans.cell(r, 6, exp_text)

                file_questions.append({
                    'grade': grade,
                    'category': category,
                    'type': qtype,
                    'file_key': fname,
                    'question_no': qno,
                    'tag_key': tag_key,
                    'question': prob_info['question'],
                    'difficulty': prob_info['difficulty'],
                    'subject_category': prob_info['subject_category'],
                    'option_1': None,
                    'option_2': None,
                    'option_3': None,
                    'option_4': None,
                    'correct_option': None,
                    'journal_debit': json.dumps(debit_entries, ensure_ascii=False),
                    'journal_credit': json.dumps(credit_entries, ensure_ascii=False),
                    'explanation': exp_text,
                    'is_verified': 1
                })

        wb.save(fpath)
        print(f'  -> ?? ?? ?? ({len(file_questions)}??): {fname}')
        
        json_cache_path = os.path.join(DATA_CACHE_DIR, fname + '.json')
        with open(json_cache_path, 'w', encoding='utf-8') as jf:
            json.dump(file_questions, jf, ensure_ascii=False, indent=2)
            
        all_processed_questions.extend(file_questions)

    print(f'\n[?? ??] ? {len(all_processed_questions)}?? ?? ??!')
    return all_processed_questions

def generate_unified_account_sql(questions):
    sql_lines = []
    sql_lines.append("""-- =========================================================
-- ???? ??? DB ??? ? ?? ?? ??? (MariaDB ?)
-- phpMyAdmin SQL ?? ???? ? ?????
-- SSH: mysql -u root -p account_db < account.sql
-- =========================================================

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+09:00";

-- ---------------------------------------------------------
-- 1. ???(Users) ???
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id`            int(11)             NOT NULL AUTO_INCREMENT,
  `username`      varchar(50)         NOT NULL                        COMMENT '??? ???',
  `password_hash` varchar(255)        NOT NULL                        COMMENT '???? ????',
  `role`          enum('user','admin') DEFAULT 'user'                 COMMENT '??? ??',
  `is_blocked`    tinyint(1)          DEFAULT 0                       COMMENT '?? ?? (0:??, 1:??)',
  `block_reason`  varchar(255)        DEFAULT NULL                    COMMENT '?? ?? ??',
  `created_at`    datetime            DEFAULT current_timestamp()     COMMENT '???',
  `last_login_at` datetime            DEFAULT NULL                    COMMENT '??? ??? ??',
  `last_login_ip` varchar(45)         DEFAULT NULL                    COMMENT '??? ?? IP',
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='?? ?? ???';

ALTER TABLE `users`
  ADD COLUMN IF NOT EXISTS `is_blocked`    tinyint(1)   NOT NULL DEFAULT 0    COMMENT '?? ?? (0:??, 1:??)',
  ADD COLUMN IF NOT EXISTS `block_reason`  varchar(255)          DEFAULT NULL  COMMENT '?? ?? ??',
  ADD COLUMN IF NOT EXISTS `last_login_at` datetime              DEFAULT NULL  COMMENT '??? ??? ??',
  ADD COLUMN IF NOT EXISTS `last_login_ip` varchar(45)           DEFAULT NULL  COMMENT '??? ?? IP';

-- ---------------------------------------------------------
-- 2. ??? ?? ?? (User Logs) ???
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS `user_logs` (
  `id`         int(11)     NOT NULL AUTO_INCREMENT,
  `user_id`    int(11)     NOT NULL                    COMMENT '??? ID',
  `action`     varchar(50) NOT NULL                    COMMENT '?? ?? (login, solve_quiz ?)',
  `detail`     text        DEFAULT NULL                COMMENT '?? ??',
  `ip_address` varchar(45) NOT NULL                    COMMENT '?? IP',
  `created_at` datetime    DEFAULT current_timestamp() COMMENT '?? ??',
  PRIMARY KEY (`id`),
  KEY `idx_user_action` (`user_id`, `action`),
  CONSTRAINT `fk_user_logs_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='??? ?? ??';

-- ---------------------------------------------------------
-- 3. ???? ?? (Download Logs) ???
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS `download_logs` (
  `id`            bigint      NOT NULL AUTO_INCREMENT,
  `user_id`       varchar(64) DEFAULT NULL              COMMENT '????? ?? ID',
  `file_path`     text        NOT NULL                  COMMENT '????? ?? ??',
  `ip_address`    varchar(64) DEFAULT NULL              COMMENT '?? IP',
  `downloaded_at` datetime    NOT NULL DEFAULT NOW()    COMMENT '???? ??',
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_downloaded_at` (`downloaded_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='?? ???? ??';

ALTER TABLE `download_logs`
  ADD COLUMN IF NOT EXISTS `file_path`     text     DEFAULT NULL   COMMENT '????? ?? ??',
  ADD COLUMN IF NOT EXISTS `downloaded_at` datetime DEFAULT NULL   COMMENT '???? ??';

-- ---------------------------------------------------------
-- 4. ?? ?? (Learning Stats) ???
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS `learning_stats` (
  `id`            int(11)     NOT NULL AUTO_INCREMENT,
  `user_id`       int(11)     NOT NULL,
  `grade`         varchar(20) NOT NULL                                    COMMENT '?? (grade1, grade2)',
  `subject`       varchar(50) NOT NULL                                    COMMENT '?? (??, ?? ?)',
  `total_solved`  int(11)     DEFAULT 0                                   COMMENT '? ? ?? ?',
  `correct_count` int(11)     DEFAULT 0                                   COMMENT '?? ?',
  `wrong_count`   int(11)     DEFAULT 0                                   COMMENT '?? ?',
  `updated_at`    datetime    DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_user_grade_subject` (`user_id`, `grade`, `subject`),
  CONSTRAINT `fk_learning_stats_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='??? ?? ?? ??';

-- ---------------------------------------------------------
-- 5. ?? ?? (Quiz Questions) ???
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS `quiz_questions` (
  `id`               int(11)      NOT NULL AUTO_INCREMENT,
  `grade`            varchar(20)  NOT NULL                 COMMENT '?? (grade1, grade2)',
  `category`         varchar(50)  NOT NULL                 COMMENT '?? (????, ?????)',
  `type`             enum('journal','theory') NOT NULL     COMMENT '?? (journal: ??, theory: ??)',
  `file_key`         varchar(100) NOT NULL                 COMMENT '?? ?? ? (?: 1?_????_??.xlsx)',
  `question_no`      int(11)      NOT NULL                 COMMENT '?? ??',
  `tag_key`          varchar(100) DEFAULT NULL             COMMENT '?? ? (round_118_2 ?)',
  `question`         text         NOT NULL                 COMMENT '?? ??',
  `difficulty`       varchar(20)  DEFAULT ''               COMMENT '??? (?, ?, ?)',
  `subject_category` varchar(100) DEFAULT ''               COMMENT '?? ? ?? ?? (????, ???? ?)',
  `option_1`         text         DEFAULT NULL             COMMENT '?? 1?',
  `option_2`         text         DEFAULT NULL             COMMENT '?? 2?',
  `option_3`         text         DEFAULT NULL             COMMENT '?? 3?',
  `option_4`         text         DEFAULT NULL             COMMENT '?? 4?',
  `correct_option`   tinyint(4)   DEFAULT NULL             COMMENT '?? ?? ?? (1~4)',
  `journal_debit`    longtext     DEFAULT NULL             COMMENT '?? ?? JSON ([{"account":"...", "amount":...}])',
  `journal_credit`   longtext     DEFAULT NULL             COMMENT '?? ?? JSON ([{"account":"...", "amount":...}])',
  `explanation`      text         DEFAULT NULL             COMMENT '?? ??',
  `is_verified`      tinyint(1)   DEFAULT 1                COMMENT '?? ?? ?? (1: ??, 0: ????)',
  `created_at`       datetime     DEFAULT current_timestamp(),
  `updated_at`       datetime     DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_quiz_file` (`file_key`, `question_no`),
  KEY `idx_quiz_filter` (`grade`, `category`, `type`),
  KEY `idx_quiz_tag` (`tag_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='???? ?? ??';

TRUNCATE TABLE `quiz_questions`;
""")

    def escape_sql(val):
        if val is None:
            return 'NULL'
        v_str = str(val).replace('\\', '\\\\').replace("'", "''").replace('\r\n', '\n').replace('\r', '\n')
        return f"'{v_str}'"
    
    batch_size = 50
    for i in range(0, len(questions), batch_size):
        batch = questions[i:i + batch_size]
        values = []
        for q in batch:
            row_val = (
                f"({escape_sql(q['grade'])}, "
                f"{escape_sql(q['category'])}, "
                f"{escape_sql(q['type'])}, "
                f"{escape_sql(q['file_key'])}, "
                f"{q['question_no']}, "
                f"{escape_sql(q['tag_key'])}, "
                f"{escape_sql(q['question'])}, "
                f"{escape_sql(q['difficulty'])}, "
                f"{escape_sql(q['subject_category'])}, "
                f"{escape_sql(q['option_1'])}, "
                f"{escape_sql(q['option_2'])}, "
                f"{escape_sql(q['option_3'])}, "
                f"{escape_sql(q['option_4'])}, "
                f"{q['correct_option'] if q['correct_option'] is not None else 'NULL'}, "
                f"{escape_sql(q['journal_debit'])}, "
                f"{escape_sql(q['journal_credit'])}, "
                f"{escape_sql(q['explanation'])}, "
                f"1)"
            )
            values.append(row_val)
        
        insert_stmt = (
            "INSERT INTO `quiz_questions` ("
            "`grade`, `category`, `type`, `file_key`, `question_no`, `tag_key`, `question`, `difficulty`, `subject_category`, "
            "`option_1`, `option_2`, `option_3`, `option_4`, `correct_option`, `journal_debit`, `journal_credit`, `explanation`, `is_verified`"
            ") VALUES\n" + ",\n".join(values) + ";"
        )
        sql_lines.append(insert_stmt)
        
    sql_lines.append("COMMIT;")
    
    with open(SQL_FILE, 'w', encoding='utf-8') as f:
        f.write('\n'.join(sql_lines))
        
    print(f"\n[??] '{SQL_FILE}' ?? SQL ?? ?? ??! (??: {os.path.getsize(SQL_FILE):,} bytes)")

if __name__ == '__main__':
    all_q = process_all_files()
    generate_unified_account_sql(all_q)
