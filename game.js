'use strict';
const $ = selector => document.querySelector(selector);
const titles = ['校園送件路線','編輯室牆上的留言','被墨水遮住的檔案編號','歌譜裡的四個字','校史剪報的年份','窗框裡的祝福'];
const nodes = [['S','校門口',245,60],['F','穿堂',400,140],['H','健康中心',510,245],['I','科學教室',615,390],['M','中庭',390,350],['L','合作社',510,525],['K','活動中心',510,675],['J','音樂教室',645,590],['A','體育館',805,580],['B','操場',675,850],['C','美術教室',425,835],['D','園藝角',270,675],['E','圖書館',205,260],['G','社刊編輯室',65,140]];
const edges = ['SF','FE','FH','FM','EG','ED','HI','IM','IL','IJ','IA','ML','MD','LK','KJ','KA','KB','KD','JA','AB','BC','CD'];
const poems = ['今晨書聲滿校園','藍天映照操場邊','不忘同窗共讀時','攜手做完新專刊','書頁翻開明日夢','鐘聲響起向天望','同窗攜手不落後','莫待悔時嘆光陰'];
const counts = [1,2,1,3,5,6,7,3];
const grid = [[0,0,0,0,0,0],[0,7,8,8,9,0],[0,1,2,2,3,0],[0,0,7,9,0,0],[0,0,0,0,0,0],[0,0,1,3,0,0],[0,9,0,0,7,0],[0,1,0,0,0,0],[0,0,6,4,9,0],[0,0,0,0,9,0],[0,0,0,0,0,0]];
const shapes = ['', 'right bottom','left right bottom','left bottom','top right bottom','top right bottom left','top left bottom','top right','top left right','top left'];
const hints = [
 'G 只連著 E，請把 E 留在倒數第二站。C 只連著 B 和 D，試著把這三站排成連續的一段。',
 '每行旁邊的鉛筆有幾支，就從左往右數到第幾個字。例如有兩支，就選那行第二個字。',
 '把中間兩個數字相乘，再把最外側兩個數字接起來比較。題目的外側數字組成 35，較小的因數填左邊。',
 '從第一段演唱跟譜，每行取一字。第三行圈住兩個相連的音，演唱時是同一個字。',
 '提示一：出版日期不在最大的標題裡，看看報紙最上方。',
 '數字代表九宮格中的位置，描出它旁邊的內部框線。例如 3 是左邊與下邊的「└」。0 留白。'
];
const rewards = [
 '資料收齊了！管理員的留言提到一個檔案編號，可惜字被墨水弄糊。小夏看著滿桌資料，想明天再找。你注意到牆上的一張留言。',
 '「今天不做明天後悔！」小夏笑了：「好，我們今天把它找回來。」她把受損的編號標籤排在桌上。',
 '357.5 的資料夾打開了，裡面是〈望春風〉歌譜和管理員借用音樂社尋寶題設計的線索。',
 '線索袋打開了，裡面有一張〈望春風〉舊報紙和校史筆記。',
 '1937 年的資料夾裡，保存著舊校舍窗框紀錄。管理員寫著：「把線條補回去，就知道修補夾收在哪個資料盒。」',
 ''
];
function fresh() { return {version:1,stage:0,done:0,path:['S'],poem:Array(8).fill(null),code:[null,null],words:'',year:Array(4).fill(null),lines:Array(66).fill(null),box:false}; }
let state = fresh(), activeSlot = 0, activeCell = null, storageOK = true;
try {
 const saved = JSON.parse(localStorage.getItem('reading-detectives-v1'));
 if (saved && saved.version === 1 && Number.isInteger(saved.done) && saved.done >= 0 && saved.done <= 6 && Number.isInteger(saved.stage) && saved.stage >= 0 && saved.stage <= Math.min(saved.done,5) && Array.isArray(saved.path) && saved.path[0]==='S' && saved.path.length<=14 && new Set(saved.path).size===saved.path.length && saved.path.every((id,i)=>nodes.some(n=>n[0]===id) && (i===0 || edges.some(e=>e.includes(saved.path[i-1])&&e.includes(id)))) && ['poem','code','year','lines'].every((key,i)=>Array.isArray(saved[key]) && saved[key].length===[8,2,4,66][i] && saved[key].every(v=>v===null || Number.isInteger(v)&&v>=0&&v<=9)) && typeof saved.words==='string' && typeof saved.box==='boolean') state = saved;
} catch (_) { storageOK = false; }
function save() {
 try { localStorage.setItem('reading-detectives-v1',JSON.stringify(state)); } catch (_) { storageOK = false; }
 $('#save-status').textContent = storageOK ? '進度已保存在這台裝置的瀏覽器，重新整理可繼續。' : '這個瀏覽器無法保存進度，請保持本頁開啟。';
}
function feedback(text) { $('#feedback').textContent = text; }
function complete() { activeCell=null; state.done = Math.max(state.done,state.stage+1); save(); render(); feedback(rewards[state.stage]); }
function numericSlots(values, labels) {
 return '<div class="code">'+values.map((v,i)=>'<div class="slot"><button data-slot="'+i+'" class="'+(activeSlot===i?'active':'')+'" aria-label="'+labels[i]+'">'+(v??'?')+'</button><small>'+labels[i]+'</small></div>').join('')+'</div><div class="keys">'+Array.from({length:10},(_,i)=>'<button data-number="'+i+'">'+i+'</button>').join('')+'</div>';
}
function shapeHTML(n, label='') { return '<span class="shape '+shapes[n]+'">'+label+'</span>'; }
function scene() {
 switch(state.stage) {
 case 0: return '<p>校慶社刊明天就要付印，最後一頁卻不見了。小夏請你先收齊校園各站的採訪資料，送到社刊編輯室。</p><p>從 <b>S 校門口</b>出發，沿道路走遍每個地點各一次，最後抵達 <b>G 社刊編輯室</b>。點地點就能前進。</p><div class="board"><div class="map"><canvas width="960" height="990" aria-hidden="true"></canvas>'+nodes.map(([id,name,x,y])=>'<button class="stop '+(state.path.includes(id)?'visited ':'')+(state.path.at(-1)===id?'current':'')+'" style="left:'+x/9.6+'%;top:'+y/9.9+'%" data-node="'+id+'"><b>'+id+'</b><span>'+name+'</span></button>').join('')+'</div></div><small class="note">小螢幕可左右滑動地圖。走錯可撤回最後一步。</small><p id="route">目前路線　'+state.path.join(' → ')+'（'+state.path.length+'/14 站）</p>';
 case 1: return '<p>小夏想把尋頁工作拖到明天。牆上貼著歷屆社員留下的八行短詩：「數一數每行旁邊的鉛筆，取出相同位置的字，把提醒我們的話讀出來。」</p><p>每行選一個字，依序組成八字留言。再點別的字即可改選。</p>'+poems.map((line,r)=>'<div class="poem-row"><div class="icons" aria-label="'+counts[r]+' 支鉛筆">'+ '✎ '.repeat(counts[r])+'</div><div class="verse">'+[...line].map((ch,c)=>'<button data-row="'+r+'" data-char="'+c+'" class="'+(state.poem[r]===c?'selected':'')+'" aria-pressed="'+(state.poem[r]===c)+'">'+ch+'</button>').join('')+'</div></div>').join('')+'<p>你找出的留言　<b>'+poems.map((l,r)=>l[state.poem[r]]??'□').join('')+'</b></p>';
 case 2: return '<p>管理員的留言指向一個檔案編號。小夏把六張完整標籤排在旁邊，請你補回被墨水蓋住的兩個數字。</p><div class="labels">'+['134.2','237.1','467.2','569.4','679.3','247.8'].map(x=>'<div class="label">'+x+'</div>').join('')+'</div><h3 style="text-align:center">3 □ □ .5</h3>'+numericSlots(state.code,['小數字','大數字'])+'<p>點數字填入兩格，點格子可改選。小數點是編號的分隔記號。</p>';
 case 3: return '<p>357.5 的資料夾裡是一張〈望春風〉歌譜。管理員留了字條：「這是音樂社以前設計的尋寶題。找出圈選處對應的四個字，就能打開校史線索袋。」</p><a class="listen" href="https://www.youtube.com/watch?v=CmPywDGrMKA" target="_blank" rel="noopener noreferrer">▶ 到 YouTube 聽〈望春風〉（另開分頁）</a><p>從第一段演唱開始，跟著簡譜由左往右讀。每行取一個圈對應的字；聽完切回本頁。</p><img class="score" src="score.png" alt="望春風簡譜，每行一個圈，共四個圈。"><button data-image="score.png">放大歌譜</button><p><label for="words">依序填四個字</label></p><input id="words" autocomplete="off" placeholder="第一行 → 第四行">';
 case 4: return '<p>小夏在校史資料裡找到這張〈望春風〉剪報，但收納袋上的年份已經模糊了。請從報紙中找出出版日期，將它放回正確的西元年份資料夾。</p><blockquote><b>舊資料整理筆記</b><br>舊報刊不一定使用西元紀年，也可能使用年號。昭和元年對應西元 1926 年；元年就是第一年。</blockquote><img class="news" src="newspaper.jpg" alt="望春風舊報紙，報頭日期為昭和十二年七月一日"><button data-image="newspaper.jpg">放大報紙</button><p>請填入四位數西元年份。</p>'+numericSlots(state.year,['千位','百位','十位','個位']);
 case 5: {
 const table = grid.map((row,r)=>'<tr>'+row.map((n,c)=>{const i=r*6+c;return n===0?'<td class="zero">'+(state.done>5?'':'0')+'</td>':'<td><button data-cell="'+i+'" class="'+(activeCell===i?'chosen':'')+'" aria-label="第'+(r+1)+'列第'+(c+1)+'欄，數字'+n+'，'+(state.lines[i]?'已選線形'+state.lines[i]:'尚未填線')+'">'+(state.lines[i]?shapeHTML(state.lines[i],state.done>5?'':n):n)+'</button></td>'}).join('')+'</tr>').join('');
 return '<p>舊校舍窗框上藏著學校給學生的祝福。用九宮格的位置對照表，補回數字格周圍的線條，讀出兩個字，再找到同名的資料盒。</p><p>先點下方數字格，再選它在九宮格裡對應的線形。0 留白。</p><div class="legend" aria-label="九宮格位置與線形對照">'+Array.from({length:9},(_,i)=>'<div>'+shapeHTML(i+1,i+1)+'</div>').join('')+'</div><table class="puzzle" aria-label="窗框數字格">'+table+'</table><p class="pick-label">'+(activeCell===null?'先選一個有數字的格子':'正在填第 '+(Math.floor(activeCell/6)+1)+' 列、第 '+(activeCell%6+1)+' 欄')+'</p><div class="picker">'+Array.from({length:9},(_,i)=>'<button data-shape="'+(i+1)+'" aria-label="選擇線形'+(i+1)+'">'+shapeHTML(i+1)+'</button>').join('')+'</div>'+(state.done>5?'<div class="complete"><h3>窗框的字出現了</h3><p>從上往下讀，選擇同名資料盒。</p><div class="boxes"><button data-box="青春">青春</button><button data-box="平安">平安</button><button data-box="回憶">回憶</button></div></div>':'')+(state.box?'<section class="paper"><h3>最後一頁，找到了！</h3><p>管理員發現裝訂線鬆脫，先把這一頁收好修補，再借用校史館的尋寶題，替閱讀偵探社留下一條線索路線。</p><blockquote>願每個走進校門的人，都能平安回家。<br>願我們在這裡讀過的書、交過的朋友，<br>成為往後日子裡，陪伴彼此的力量。</blockquote><p>小夏把最後一頁放回社刊，在送印單上打了一個勾。</p><b>閱讀偵探社，全員完成任務。</b><p><button data-replay>♫ 再歡呼一次</button></p></section>':'');
 }
 }
}
function drawMap() {
 const ctx=$('canvas').getContext('2d');
 const lookup=Object.fromEntries(nodes.map(n=>[n[0],n]));
 function line(a,b,color,width){ctx.beginPath();ctx.moveTo(lookup[a][2],lookup[a][3]);ctx.lineTo(lookup[b][2],lookup[b][3]);ctx.lineWidth=width;ctx.strokeStyle=color;ctx.lineCap='round';ctx.stroke()}
 edges.forEach(e=>line(e[0],e[1],'#fbf8ed',18));edges.forEach(e=>line(e[0],e[1],'#aebca1',2));
 state.path.slice(1).forEach((id,i)=>line(state.path[i],id,'#b4803b',8));
}
function render() {
 $('#title').textContent=(state.stage+1)+' · '+titles[state.stage];
 $('#scene').innerHTML=scene();
 if(state.stage===0)drawMap();
 if(state.stage===3)$('#words').value=state.words;
 $('#nav').innerHTML=titles.map((t,i)=>'<button data-stage="'+i+'" '+(i>state.done?'disabled':'')+(i===state.stage?' aria-current="step"':'')+'>'+(i+1)+' '+t+'</button>').join('');
 const locked=state.done>state.stage;
 $('#actions').innerHTML=state.stage===0?'<button data-action="undo" '+(state.path.length===1||locked?'disabled':'')+'>↶ 撤回最後一步</button><button data-action="clear" '+(state.path.length===1||locked?'disabled':'')+'>清空路線，從校門重走</button>':locked?'':'<button class="primary" data-action="check">'+['','讀出留言','取出檔案','打開線索袋','找到年份資料夾','核對窗框'][state.stage]+'</button>';
 if(locked)$('#scene').querySelectorAll('button:not([data-image]):not([data-box]):not([data-replay]),input').forEach(e=>e.disabled=true);
 $('#next').hidden=!locked||state.stage===5;$('#previous').disabled=state.stage===0;
 $('#hint').hidden=locked;$('#hint').open=false;$('#hint-text').textContent=hints[state.stage];if(state.stage===4)$('#hint-text').innerHTML+=' <details><summary>再給我一點提示</summary><p>試著從右往左讀日期，找出年號與第幾年。</p><details><summary>我需要換算提示</summary><p>元年已經算第一年，所以十二年要從 1926 年再往後數十一年。</p></details></details>';
 feedback(locked?rewards[state.stage]:'');save();
}
function go(stage){state.stage=stage;activeSlot=0;activeCell=null;render();$('#title').focus()}
function check() {
 switch(state.stage) {
 case 1: if(!state.poem.every((v,r)=>v===counts[r]-1))return feedback('再數一次每行的鉛筆，每行取一個字，並按行的順序讀。');break;
 case 2:
 if(state.code.includes(null))return feedback('請先補齊兩格。');
 if(state.code[0]*state.code[1]!==35)return feedback('還沒符合標籤規律，看看中間兩數和最外側兩數的關係。');
 if(state.code[0]>=state.code[1])return feedback('乘積對了，請把較小數字放左邊。');break;
 case 3: if(state.words.replace(/\s/g,'')!=='伴家人心')return feedback('請逐行核對圈選處的字，每行只取一字。');break;
 case 4: if(state.year.join('')!=='1937')return feedback('年份還沒對上，請核對報頭的年號與年份，再參考整理筆記。');break;
 case 5: if(!grid.flat().every((n,i)=>!n||state.lines[i]===n))return feedback('還有線條與九宮格的位置不符，請逐格比對邊框方向。');break;
 }
 complete();
}
$('#nav').onclick=e=>{if(e.target.dataset.stage!==undefined)go(+e.target.dataset.stage)};
$('#next').onclick=()=>go(state.stage+1);$('#previous').onclick=()=>go(state.stage-1);
$('#actions').onclick=e=>{
 if(e.target.dataset.action==='check')check();
 if(e.target.dataset.action==='undo'){state.path.pop();render()}
 if(e.target.dataset.action==='clear'){state.path=['S'];render()}
};
$('#scene').oninput=e=>{if(e.target.id==='words'){state.words=e.target.value;save();feedback('')}};
$('#scene').onclick=e=>{
 const b=e.target.closest('button');if(!b||b.disabled)return;
 if(b.hasAttribute('data-replay')){celebrate();return}
 if(b.dataset.image){$('#large-image').src=b.dataset.image;$('#image-dialog').showModal();return}
 if(b.dataset.box){if(b.dataset.box!=='平安')return feedback('這個盒名和窗框上的字不同，再看看拼出的兩個字。');const first=!state.box;state.box=true;render();feedback('你找回了消失的最後一頁！');if(first)celebrate();return}
 if(state.done>state.stage)return;
 if(b.dataset.node){
 const id=b.dataset.node,current=state.path.at(-1);
 if(state.path.includes(id))return feedback('這個地點已經走過，需要改路時請撤回最後一步。');
 if(!edges.some(e=>e.includes(current)&&e.includes(id)))return feedback('這兩站沒有道路相連，請沿圖上的線走。');
 if(id==='G'&&state.path.length!==13)return feedback('還有地點沒走到，請把 G 留到最後。');
 state.path.push(id);if(state.path.length===14){complete();return}render();return;
 }
 if(b.dataset.row!==undefined){state.poem[+b.dataset.row]=+b.dataset.char;render();return}
 if(b.dataset.slot!==undefined){activeSlot=+b.dataset.slot;render();return}
 if(b.dataset.number!==undefined){const values=state.stage===2?state.code:state.year;values[activeSlot]=+b.dataset.number;activeSlot=Math.min(values.length-1,activeSlot+1);render();return}
 if(b.dataset.cell!==undefined){activeCell=+b.dataset.cell;render();return}
 if(b.dataset.shape){if(activeCell===null)return feedback('請先點一個要填線的數字格。');state.lines[activeCell]=+b.dataset.shape;render()}
};
$('#restart').onclick=()=>$('#restart-dialog').showModal();
$('#cancel-restart').onclick=()=>$('#restart-dialog').close();
$('#confirm-restart').onclick=()=>{state=fresh();activeSlot=0;activeCell=null;$('#restart-dialog').close();render();$('#title').focus()};
$('#close-image').onclick=()=>$('#image-dialog').close();
render();

let victoryAudio=null, victoryTimer=null;
function stopVictory(){
 clearTimeout(victoryTimer);
 if(victoryAudio){victoryAudio.close().catch(()=>{});victoryAudio=null;}
 document.querySelector('#confetti')?.remove();
}
function celebrate(){
 stopVictory();
 const dialog=$('#victory-dialog');if(!dialog.open)dialog.showModal();
 $('#victory-audio-note').textContent='♫ 原創勝利短曲';
 const confetti=document.createElement('div');confetti.id='confetti';confetti.setAttribute('aria-hidden','true');
 for(let i=0;i<48;i++){const piece=document.createElement('i');piece.style.cssText=`left:${Math.random()*100}%;background:${['#dfaf46','#3f8973','#d96955','#fff2ae'][i%4]};animation-delay:${Math.random()*.7}s;`;confetti.append(piece)}
 dialog.append(confetti);
 try{
 const Audio=window.AudioContext||window.webkitAudioContext;
 victoryAudio=new Audio();const ctx=victoryAudio;
 ctx.resume().then(()=>{
 if(ctx.state==='closed')return;
 const start=ctx.currentTime+.04;
 [[0,523.25,.15],[.18,659.25,.15],[.36,783.99,.15],[.56,1046.5,.55],[1.2,783.99,.18],[1.43,1046.5,.9],[1.43,659.25,.9],[1.43,523.25,.9]].forEach(([t,hz,d])=>{
 const o=ctx.createOscillator(),g=ctx.createGain();o.type='triangle';o.frequency.value=hz;
 g.gain.setValueAtTime(0,start+t);g.gain.linearRampToValueAtTime(.075,start+t+.025);g.gain.exponentialRampToValueAtTime(.001,start+t+d);
 o.connect(g);g.connect(ctx.destination);o.start(start+t);o.stop(start+t+d+.02);
 });
 }).catch(()=>{$('#victory-audio-note').textContent='裝置未播放聲音，可關閉靜音後再歡呼一次。'});
 }catch(_){$('#victory-audio-note').textContent='這台裝置無法播放音效，仍可欣賞通關畫面。'}
 victoryTimer=setTimeout(stopVictory,4200);
}
$('#close-victory').onclick=()=>$('#victory-dialog').close();
$('#victory-dialog').addEventListener('close',stopVictory);
