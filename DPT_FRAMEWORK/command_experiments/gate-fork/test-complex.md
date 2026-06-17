# test-gate-fork-complex (复杂)

完整端到端——4 segments + Fork pass/fail_a/fail_b/converge + C&I。Bundle: `dpt_rb_test_gf_complex/`，痕迹: `_trace_gf_complex.jsonl`

```bash
B="dpt_rb_test_gf_complex"
echo $'\x1b[36m═══ Complex: 全功能 Fork ═══\x1b[0m'
mkdir -p $B/{seed_topics,reference,artifacts/wave1,artifacts/wave2,_cache,final}
for f in DPT_FRAMEWORK/rb_templates/*.tmpl; do name=$(basename "$f" .tmpl); sed "s/{{name}}/gf_complex/g" "$f" > "$B/$name"; done
cp DPT_FRAMEWORK/rb_templates/rb_trace.jsonl $B/

# Step 1: init trace
cat > $B/t.mjs << 'JS'
import { setTraceFile, traceInit } from '../experiments/prototype-gate-fork/trace.mjs';
setTraceFile('dpt_rb_test_gf_complex/_trace_gf_complex.jsonl');
traceInit('gf-playbook/complex', { source: 'gf-playbook/complex' });
JS
node $B/t.mjs > /dev/null 2>&1
node DPT_FRAMEWORK/cli/check.mjs $B > /dev/null 2>&1

# Step 2: Fork + Converge + 4 segments + C&I
cat > $B/t.mjs << 'JS'
import { setTraceFile, traceEntry } from '../experiments/prototype-gate-fork/trace.mjs';
setTraceFile('dpt_rb_test_gf_complex/_trace_gf_complex.jsonl');
import {
  evaluateBranch, forkRouter, convergeRepair,
  loadNextSegment, runForkPipeline,
  checkAndReflect, WorkflowState
} from '../experiments/prototype-gate-fork/gate-fork.mjs';

const SRC = 'gf-playbook/complex';

// Verify all 4 branches route correctly
traceEntry('verify', { source: SRC, step:'fork_pass', p:evaluateBranch({current_gate:'x',ref_count:5,ref_floor:5,topicReadiness:'ready'})==='pass' });
traceEntry('verify', { source: SRC, step:'fork_fail_a', p:evaluateBranch({current_gate:'x',ref_count:2,ref_floor:5,topicReadiness:'ready'})==='fail_a' });
traceEntry('verify', { source: SRC, step:'fork_fail_b', p:evaluateBranch({current_gate:'x',ref_count:5,ref_floor:5,topicReadiness:'not_ready'})==='fail_b' });
traceEntry('verify', { source: SRC, step:'fork_blocked', p:evaluateBranch({current_gate:'x',ref_count:5,ref_floor:5,topicReadiness:'blocked'})==='blocked' });

// Converge repair: multi-issue state
const r=convergeRepair({current_gate:'x',ref_count:1,ref_floor:5,topicReadiness:'not_ready'});
traceEntry('verify', { source: SRC, step:'converge_multi', p:r.outcome==='pass', its:r.iterations });

// 4 dynamic segments
for(const k of['pass_next_wave','fail_a_topic_repair','fail_b_reference_repair','shared_repair']){
  const s=loadNextSegment(k);s.execute({current_gate:'x',ref_count:3,ref_floor:5,topicReadiness:'ready'});
  traceEntry('seg', { source: SRC, caller:'complex', key:k });
}

// Pipeline test
const pipeline=runForkPipeline({current_gate:'x',ref_count:2,ref_floor:5,topicReadiness:'ready'});
traceEntry('verify', { source: SRC, step:'pipeline_pass', p:pipeline.finalState.current_gate==='wave_next' });

// C&I feedback loop
const bad=checkAndReflect({current_gate:'x',ref_count:'bad',ref_floor:5,topicReadiness:'ready'},WorkflowState);
traceEntry('verify', { source: SRC, step:'ci_fail', p:!bad.passed });
const good=checkAndReflect({current_gate:'x',ref_count:5,ref_floor:5,topicReadiness:'ready'},WorkflowState);
traceEntry('verify', { source: SRC, step:'ci_pass', p:good.passed });

// C&I with topicReadiness
const badTopic=checkAndReflect({current_gate:'x',ref_count:5,ref_floor:5,topicReadiness:'invalid'},WorkflowState);
traceEntry('verify', { source: SRC, step:'ci_topic_fail', p:!badTopic.passed });
JS
node $B/t.mjs > /dev/null 2>&1 && sleep 2

# Step 3: trace verification
echo $'\x1b[36m═══ Complex trace ═══\x1b[0m'
cat > $B/t.mjs << 'ENDJS'
import { readFileSync } from 'node:fs';
import { setTraceFile, getTraceFile, traceCleanup } from '../experiments/prototype-gate-fork/trace.mjs';
setTraceFile('dpt_rb_test_gf_complex/_trace_gf_complex.jsonl');
const e=JSON.parse('['+readFileSync(getTraceFile(),'utf-8').trim().split('\n').join(',')+']');
const v=e.filter(x=>x.event==='verify'),s=e.filter(x=>x.event==='seg'||x.event==='segment_exec'),m=e.filter(x=>x.event==='md_exec');
console.log('v:'+v.length+' s:'+s.length+' m:'+m.length+' tot:'+e.length);
console.log(v.length>=9&&s.length>=4?'\x1b[32mCOMPLEX PASS\x1b[0m':'\x1b[31mCOMPLEX FAIL\x1b[0m');
traceCleanup();
ENDJS
node $B/t.mjs
rm -rf $B
echo $'\x1b[32mComplex done.\x1b[0m'
```
