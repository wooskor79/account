$path = "js/main.js"
$content = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)

# 6. users.map 수정
$target6 = "                                    <td class=""p-3 font-extrabold text-white flex items-center gap-1.5"">
                                        <span>👤</span> <span>${u.username}</span>
                                    </td>
                                    <td class=""p-3 text-slate-400"">
                                        <div class=""text-[11px] text-slate-300"">${u.created_at ? u.created_at.split('T')[0] : '-'}</div>
                                        <div class=""text-[10px] text-slate-500"">최근: ${u.last_login ? u.last_login.split('T')[0] : '-'}</div>
                                    </td>
                                    <td class=""p-3"">
                                        <div class=""flex items-center gap-2"">
                                            <div class=""w-16 bg-slate-800 h-2 rounded-full overflow-hidden"">
                                                <div class=""bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full"" style=""width: ${u.total_pct}%""></div>
                                            </div>
                                            <span class=""font-extrabold text-emerald-400 font-mono"">${u.total_pct}%</span>
                                        </div>
                                    </td>
                                    <td class=""p-3 font-mono"">
                                        <span class=""font-bold text-white"">${u.solved_count}</span>
                                        <span class=""text-[11px] text-sky-400 font-bold ml-1"">(${u.accuracy}%)</span>
                                    </td>
                                    <td class=""p-3"">
                                        <span class=""px-2 py-0.5 bg-indigo-950 text-indigo-300 border border-indigo-800 rounded-md font-bold text-[11px]"">
                                            🎬 ${u.video_stats ? u.video_stats.watched_count : 0}강 (${u.video_stats ? u.video_stats.completed_count : 0}완료)
                                        </span>
                                    </td>
                                    <td class=""p-3"">
                                        ${u.unresolved_wrong_count > 0 ? `
                                            <span class=""px-2 py-0.5 bg-rose-950 text-rose-300 border border-rose-800 rounded-md font-bold text-[11px]"">
                                                🚨 ${u.unresolved_wrong_count}개
                                            </span>
                                        ` : `
                                            <span class=""text-emerald-400 text-[11px] font-bold"">완료됨</span>
                                        `}
                                    </td>
                                    <td class=""p-3 text-right"">
                                        <button class=""px-2.5 py-1 bg-indigo-600/80 hover:bg-indigo-600 text-white rounded-lg font-bold text-[11px] transition"" onclick=""event.stopPropagation(); openUserDetailPopup('${u.id}')"">
                                            상세 ➜
                                        </button>
                                    </td>"
$replace6 = "                                    <td class=""p-3 font-extrabold text-white flex items-center gap-1.5"">
                                        <span>👤</span> <span>${u.username}</span>
                                        ${u.is_blocked ? `<span class=""px-1.5 py-0.5 bg-rose-600 text-white text-[10px] rounded"" title=""${u.block_reason}"">차단됨</span>` : ''}
                                    </td>
                                    <td class=""p-3 text-slate-400"">
                                        <div class=""text-[11px] text-slate-300"">${u.created_at ? u.created_at.split('T')[0] : '-'}</div>
                                        <div class=""text-[10px] text-slate-500"">최근: ${u.last_login ? u.last_login.split('T')[0] : '-'}</div>
                                    </td>
                                    <td class=""p-3"">
                                        <div class=""flex items-center gap-2"">
                                            <div class=""w-16 bg-slate-800 h-2 rounded-full overflow-hidden"">
                                                <div class=""bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full"" style=""width: ${u.total_pct}%""></div>
                                            </div>
                                            <span class=""font-extrabold text-emerald-400 font-mono"">${u.total_pct}%</span>
                                        </div>
                                    </td>
                                    <td class=""p-3 font-mono"">
                                        <span class=""font-bold text-white"">${u.solved_count}</span>
                                        <span class=""text-[11px] text-sky-400 font-bold ml-1"">(${u.accuracy}%)</span>
                                    </td>
                                    <td class=""p-3"">
                                        <span class=""px-2 py-0.5 bg-indigo-950 text-indigo-300 border border-indigo-800 rounded-md font-bold text-[11px]"">
                                            🎬 ${u.video_stats ? u.video_stats.watched_count : 0}강 (${u.video_stats ? u.video_stats.completed_count : 0}완료)
                                        </span>
                                    </td>
                                    <td class=""p-3"">
                                        ${u.unresolved_wrong_count > 0 ? `
                                            <span class=""px-2 py-0.5 bg-rose-950 text-rose-300 border border-rose-800 rounded-md font-bold text-[11px]"">
                                                🚨 ${u.unresolved_wrong_count}개
                                            </span>
                                        ` : `
                                            <span class=""text-emerald-400 text-[11px] font-bold"">완료됨</span>
                                        `}
                                    </td>
                                    <td class=""p-3 text-right"">
                                        <div class=""flex items-center justify-end gap-1"">
                                            <button class=""px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold text-[11px] transition"" onclick=""event.stopPropagation(); toggleUserBlock('${u.id}', ${u.is_blocked})"">
                                                ${u.is_blocked ? '차단해제' : '차단 🚫'}
                                            </button>
                                            <button class=""px-2.5 py-1 bg-indigo-600/80 hover:bg-indigo-600 text-white rounded-lg font-bold text-[11px] transition"" onclick=""event.stopPropagation(); openUserDetailPopup('${u.id}')"">
                                                상세 ➜
                                            </button>
                                        </div>
                                    </td>"
$content = $content.Replace($target6, $replace6)

$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($path, $content, $utf8NoBom)