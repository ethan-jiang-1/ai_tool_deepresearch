# test-gate-fork-simple (简单)

Gate fork 路由 + 一个 segment。Bundle: `dpt_rb_test_gf_simple/`，痕迹: `_trace_gf_simple.jsonl`

```bash
B="dpt_rb_test_gf_simple"
echo $'\x1b[36m═══ Simple: Fork + 1 segment ═══\x1b[0m'
mkdir -p $B/{seed_topics,reference,artifacts/wave1,artifacts/wave2,_cache,final}
for f in DPT_FRAMEWORK/rb_templates/*.tmpl; do name=$(basename "$f" .tmpl); sed "s/{{name}}/gf_simple/g" "$f" > "$B/$name"; done
cp DPT_FRAMEWORK/rb_templates/rb_trace.jsonl $B/

cat > $B/t.mjs << 'JS'
import { setTraceFile, traceInit, traceEntry } from '../experiments/prototype-gate-fork/trace.mjs';
import { evaluateBranch, loadNextSegment } from '../experiments/prototype-gate-fork/gate-fork.mjs';
setTraceFile('dpt_rb_test_gf_simple/_trace_gf_simple.jsonl');
const SRC = 'gf-playbook/simple';
traceInit('gf-playbook/simple', { source: SRC });
traceEntry('verify', { source: SRC, step:'gate_pass', p:evaluateBranch({current_gate:'x',ref_count:5,ref_floor:5,topicReadiness:'ready'})==='pass' });
traceEntry('verify', { source: SRC, step:'gate_fail_a', p:evaluateBranch({current_gate:'x',ref_count:2,ref_floor:5,topicReadiness:'ready'})==='fail_a' });
const s=loadNextSegment('pass_next_wave');
s.execute({current_gate:'x',ref_count:5,ref_floor:5,topicReadiness:'ready'});
JS
node $B/t.mjs > /dev/null 2>&1 && sleep 1

cat > $B/t.mjs << 'JS'
import { readFileSync } from 'node:fs';
import { setTraceFile, getTraceFile, traceCleanup } from '../experiments/prototype-gate-fork/trace.mjs';
setTraceFile('dpt_rb_test_gf_simple/_trace_gf_simple.jsonl');
const e=JSON.parse('['+readFileSync(getTraceFile(),'utf-8').trim().split('\n').join(',')+']');
console.log('verify:'+e.filter(x=>x.event==='verify').length+' seg:'+e.filter(x=>x.event==='segment_exec').length+' tot:'+e.length);
console.log(e.filter(x=>x.event==='verify').length>=2?'\x1b[32mSIMPLE PASS\x1b[0m':'\x1b[31mSIMPLE FAIL\x1b[0m');
traceCleanup();
JS
node $B/t.mjs
rm -rf $B
echo $'\x1b[32mSimple done.\x1b[0m'
```
