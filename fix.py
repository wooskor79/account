import os

with open('js/main.js', 'r', encoding='utf-8') as f:
    content = f.read()

target = '''                                    <td class="p-3 text-right">
                                        <button class="px-2.5 py-1 bg-indigo-600/80 hover:bg-indigo-600 text-white rounded-lg font-bold text-[11px] transition" onclick="event.stopPropagation(); openUserDetailPopup('${u.id}')">
                                            상세 ➜
                                        </button>
                                    </td>'''
replace = '''                                    <td class="p-3 text-right">
                                        <div class="flex items-center justify-end gap-1">
                                            <button class="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold text-[11px] transition" onclick="event.stopPropagation(); toggleUserBlock('${u.id}', ${u.is_blocked})">
                                                ${u.is_blocked ? '차단해제' : '차단 🚫'}
                                            </button>
                                            <button class="px-2.5 py-1 bg-indigo-600/80 hover:bg-indigo-600 text-white rounded-lg font-bold text-[11px] transition" onclick="event.stopPropagation(); openUserDetailPopup('${u.id}')">
                                                상세 ➜
                                            </button>
                                        </div>
                                    </td>'''
content = content.replace(target, replace)

target2 = '''                                    <td class="p-3 font-extrabold text-white flex items-center gap-1.5">
                                        <span>👤</span> <span>${u.username}</span>
                                    </td>'''
replace2 = '''                                    <td class="p-3 font-extrabold text-white flex items-center gap-1.5">
                                        <span>👤</span> <span>${u.username}</span>
                                        ${u.is_blocked ? <span class="px-1.5 py-0.5 bg-rose-600 text-white text-[10px] rounded" title="${u.block_reason}">차단됨</span> : ''}
                                    </td>'''
content = content.replace(target2, replace2)

with open('js/main.js', 'w', encoding='utf-8') as f:
    f.write(content)

with open('index.php', 'r', encoding='utf-8') as f:
    idx = f.read()
idx = idx.replace('alert("로그아웃 되었습니다.");', 'await window.showAlert("로그아웃 되었습니다.", "로그아웃");')
with open('index.php', 'w', encoding='utf-8') as f:
    f.write(idx)