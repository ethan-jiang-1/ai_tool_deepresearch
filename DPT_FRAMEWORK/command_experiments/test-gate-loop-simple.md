# test-gate-loop-simple (简单)

Gate 路由 + 一个 segment。Bundle: `dpt_rb_test_gl_simple/`，痕迹: `_trace_gl_simple.jsonl`

```bash
B="dpt_rb_test_gl_simple"
echo "\x1b[36m═══ Simple: Gate + 1 segment ═══\x1b[0m"
mkdir -p $B/{seed_topics,reference,artifacts/wave1,artifacts/wave2,_cache,final}
for f in DPT_FRAMEWORK/rb_templates/*.tmpl; do name=$(basename "$f" .tmpl); sed "s/{{name}}/gl_simple/g" "$f" > "$B/$name"; done
cp DPT_FRAMEWORK/rb_templates/rb_trace.jsonl $B/

cat > $B/t.mjs << 'JS'
import { setTraceFile, traceInit, traceEntry } from '../experiments/prototype-gate-loop/trace.mjs';
import { evaluate, executeMDAndRun } from '../experiments/prototype-gate-loop/gate-loop.mjs';
setTraceFile('dpt_rb_test_gl_simple/_trace_gl_simple.jsonl');
traceInit('simple');
traceEntry('verify',{step:'gate',p:evaluate({current_gate:'x',ref_count:5,ref_floor:5})==='pass'});
const r=executeMDAndRun('wave0_search',{current_gate:'x',ref_count:3});r.step.execute({current_gate:'x',ref_count:3});
JS
node $B/t.mjs > /dev/null 2>&1 && sleep 1

cat > $B/t.mjs << 'JS'
import { readFileSync } from 'node:fs';
import { setTraceFile, getTraceFile, traceCleanup } from '../experiments/prototype-gate-loop/trace.mjs';
setTraceFile('dpt_rb_test_gl_simple/_trace_gl_simple.jsonl');
const e=JSON.parse('['+readFileSync(getTraceFile(),'utf-8').trim().split('\n').join(',')+']');
console.log('verify:'+e.filter(x=>x.event==='verify').length+' seg:'+e.filter(x=>x.event==='segment_exec').length+' md:'+e.filter(x=>x.event==='md_exec').length+' tot:'+e.length);
traceCleanup();
JS
node $B/t.mjs
rm -rf $B
echo "\x1b[32mSimple done.\x1b[0m"
```
