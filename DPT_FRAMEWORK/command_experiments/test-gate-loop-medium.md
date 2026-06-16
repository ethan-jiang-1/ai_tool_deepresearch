# test-gate-loop-medium (中等)

Gate pass + fail→repair + 2 segments。Bundle: `dpt_rb_test_gl_medium/`，痕迹: `_trace_gl_medium.jsonl`

```bash
B="dpt_rb_test_gl_medium"
echo "\x1b[36m═══ Medium: Gate + Repair + 2 segments ═══\x1b[0m"
mkdir -p $B/{seed_topics,reference,artifacts/wave1,artifacts/wave2,_cache,final}
for f in DPT_FRAMEWORK/rb_templates/*.tmpl; do name=$(basename "$f" .tmpl); sed "s/{{name}}/gl_medium/g" "$f" > "$B/$name"; done
cp DPT_FRAMEWORK/rb_templates/rb_trace.jsonl $B/

cat > $B/t.mjs << 'JS'
import { setTraceFile, traceInit, traceEntry } from '../experiments/prototype-gate-loop/trace.mjs';
import { evaluate, repairLoop, executeMDAndRun } from '../experiments/prototype-gate-loop/gate-loop.mjs';
setTraceFile('dpt_rb_test_gl_medium/_trace_gl_medium.jsonl');
traceInit('medium');
traceEntry('verify',{step:'gate_pass',p:evaluate({current_gate:'x',ref_count:5,ref_floor:5})==='pass'});
const r=repairLoop({current_gate:'x',ref_count:2,ref_floor:5});
traceEntry('verify',{step:'gate_repair',p:r.outcome==='pass',its:r.iterations});
for(const k of['wave0_search','repair_references']){
  const s=executeMDAndRun(k,{current_gate:'x',ref_count:3});s.step.execute({current_gate:'x',ref_count:3});
  traceEntry('seg',{caller:'medium',key:k});
}
JS
node $B/t.mjs > /dev/null 2>&1 && sleep 2

cat > $B/t.mjs << 'JS'
import { readFileSync } from 'node:fs';
import { setTraceFile, getTraceFile, traceCleanup } from '../experiments/prototype-gate-loop/trace.mjs';
setTraceFile('dpt_rb_test_gl_medium/_trace_gl_medium.jsonl');
const e=JSON.parse('['+readFileSync(getTraceFile(),'utf-8').trim().split('\n').join(',')+']');
const v=e.filter(x=>x.event==='verify'),s=e.filter(x=>x.event==='seg'||x.event==='segment_exec'),m=e.filter(x=>x.event==='md_exec');
console.log('v:'+v.length+' s:'+s.length+' m:'+m.length+' tot:'+e.length);
console.log(v.length>=2&&s.length>=4&&m.length>=2?'\x1b[32mMEDIUM PASS\x1b[0m':'\x1b[31mMEDIUM FAIL\x1b[0m');
traceCleanup();
JS
node $B/t.mjs
rm -rf $B
echo "\x1b[32mMedium done.\x1b[0m"
```
