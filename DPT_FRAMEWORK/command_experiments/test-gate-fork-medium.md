# test-gate-fork-medium (中等)

Fork pass + fail→converge + 2 segments。Bundle: `dpt_rb_test_gf_medium/`，痕迹: `_trace_gf_medium.jsonl`

```bash
B="dpt_rb_test_gf_medium"
echo $'\x1b[36m═══ Medium: Fork + Converge + 2 segments ═══\x1b[0m'
mkdir -p $B/{seed_topics,reference,artifacts/wave1,artifacts/wave2,_cache,final}
for f in DPT_FRAMEWORK/rb_templates/*.tmpl; do name=$(basename "$f" .tmpl); sed "s/{{name}}/gf_medium/g" "$f" > "$B/$name"; done
cp DPT_FRAMEWORK/rb_templates/rb_trace.jsonl $B/

cat > $B/t.mjs << 'JS'
import { setTraceFile, traceInit, traceEntry } from '../experiments/prototype-gate-fork/trace.mjs';
import { evaluateBranch, forkRouter, convergeRepair, loadNextSegment } from '../experiments/prototype-gate-fork/gate-fork.mjs';
setTraceFile('dpt_rb_test_gf_medium/_trace_gf_medium.jsonl');
const SRC = 'gf-playbook/medium';
traceInit('gf-playbook/medium', { source: SRC });
// Verify fork routing
traceEntry('verify', { source: SRC, step:'fork_pass', p:evaluateBranch({current_gate:'x',ref_count:5,ref_floor:5,topicReadiness:'ready'})==='pass' });
traceEntry('verify', { source: SRC, step:'fork_fail_a', p:evaluateBranch({current_gate:'x',ref_count:2,ref_floor:5,topicReadiness:'ready'})==='fail_a' });
traceEntry('verify', { source: SRC, step:'fork_fail_b', p:evaluateBranch({current_gate:'x',ref_count:5,ref_floor:5,topicReadiness:'not_ready'})==='fail_b' });
// Converge repair: fail_a → repair → pass
const r=convergeRepair({current_gate:'x',ref_count:2,ref_floor:5,topicReadiness:'ready'});
traceEntry('verify', { source: SRC, step:'converge_repair', p:r.outcome==='pass', its:r.iterations });
// Dynamic segment: pass branch advances
const s=loadNextSegment('pass_next_wave');
s.execute({current_gate:'x',ref_count:5,ref_floor:5,topicReadiness:'ready'});
traceEntry('seg', { source: SRC, caller:'medium', key:'pass_next_wave' });
// Dynamic segment: fail_a branch
const s2=loadNextSegment('fail_a_topic_repair');
s2.execute({current_gate:'x',ref_count:2,ref_floor:5,topicReadiness:'ready'});
traceEntry('seg', { source: SRC, caller:'medium', key:'fail_a_topic_repair' });
JS
node $B/t.mjs > /dev/null 2>&1 && sleep 2

cat > $B/t.mjs << 'JS'
import { readFileSync } from 'node:fs';
import { setTraceFile, getTraceFile, traceCleanup } from '../experiments/prototype-gate-fork/trace.mjs';
setTraceFile('dpt_rb_test_gf_medium/_trace_gf_medium.jsonl');
const e=JSON.parse('['+readFileSync(getTraceFile(),'utf-8').trim().split('\n').join(',')+']');
const v=e.filter(x=>x.event==='verify'),s=e.filter(x=>x.event==='seg'||x.event==='segment_exec'),m=e.filter(x=>x.event==='md_exec');
console.log('v:'+v.length+' s:'+s.length+' m:'+m.length+' tot:'+e.length);
console.log(v.length>=4&&s.length>=2?'\x1b[32mMEDIUM PASS\x1b[0m':'\x1b[31mMEDIUM FAIL\x1b[0m');
traceCleanup();
JS
node $B/t.mjs
rm -rf $B
echo $'\x1b[32mMedium done.\x1b[0m'
```
