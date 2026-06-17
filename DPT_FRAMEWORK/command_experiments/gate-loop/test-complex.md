# test-gate-loop-complex (复杂)

完整端到端——4 segments + Gate pass/fail/repair + C&I。Bundle: `dpt_rb_test_gl_complex/`，痕迹: `_trace_gl_complex.jsonl`

```bash
B="dpt_rb_test_gl_complex"
echo $'\x1b[36m═══ Complex: 全功能 ═══\x1b[0m'
mkdir -p $B/{seed_topics,reference,artifacts/wave1,artifacts/wave2,_cache,final}
for f in DPT_FRAMEWORK/rb_templates/*.tmpl; do name=$(basename "$f" .tmpl); sed "s/{{name}}/gl_complex/g" "$f" > "$B/$name"; done
cp DPT_FRAMEWORK/rb_templates/rb_trace.jsonl $B/

# Step 1: init trace
cat > $B/t.mjs << 'JS'
import { setTraceFile, traceInit } from '../experiments/prototype-gate-loop/trace.mjs';
setTraceFile('dpt_rb_test_gl_complex/_trace_gl_complex.jsonl');
traceInit('gl-playbook/complex', { source: 'gl-playbook/complex' });
JS
node $B/t.mjs > /dev/null 2>&1
node DPT_FRAMEWORK/cli/check.mjs $B > /dev/null 2>&1

# Step 2: Gate + Repair + 4 segments + C&I
cat > $B/t.mjs << 'JS'
import { setTraceFile, traceEntry } from '../experiments/prototype-gate-loop/trace.mjs';
setTraceFile('dpt_rb_test_gl_complex/_trace_gl_complex.jsonl');
import { evaluate, repairLoop, executeMDAndRun, checkAndReflect, WorkflowState } from '../experiments/prototype-gate-loop/gate-loop.mjs';

const SRC = 'gl-playbook/complex';

traceEntry('verify', { source: SRC, step:'gate_pass', p:evaluate({current_gate:'x',ref_count:5,ref_floor:5})==='pass' });
const r=repairLoop({current_gate:'x',ref_count:2,ref_floor:5});
traceEntry('verify', { source: SRC, step:'gate_repair', p:r.outcome==='pass', its:r.iterations });
for(const k of['wave0_search','wave0_audit','wave1_evidence','repair_references']){
  const s=executeMDAndRun(k,{current_gate:'x',ref_count:3});s.step.execute({current_gate:'x',ref_count:3});
  traceEntry('seg', { source: SRC, caller:'complex', key:k });
}
const bad=checkAndReflect({current_gate:'x',ref_count:'bad',ref_floor:5},WorkflowState);
traceEntry('verify', { source: SRC, step:'ci_fail', p:!bad.passed });
const good=checkAndReflect({current_gate:'x',ref_count:5,ref_floor:5},WorkflowState);
traceEntry('verify', { source: SRC, step:'ci_pass', p:good.passed });
JS
node $B/t.mjs > /dev/null 2>&1 && sleep 2

# Step 3: trace verification
echo $'\x1b[36m═══ Complex trace ═══\x1b[0m'
cat > $B/t.mjs << 'ENDJS'
import { readFileSync } from 'node:fs';
import { setTraceFile, getTraceFile, traceCleanup } from '../experiments/prototype-gate-loop/trace.mjs';
setTraceFile('dpt_rb_test_gl_complex/_trace_gl_complex.jsonl');
const e=JSON.parse('['+readFileSync(getTraceFile(),'utf-8').trim().split('\n').join(',')+']');
const v=e.filter(x=>x.event==='verify'),s=e.filter(x=>x.event==='seg'||x.event==='segment_exec'),m=e.filter(x=>x.event==='md_exec');
console.log('v:'+v.length+' s:'+s.length+' m:'+m.length+' tot:'+e.length);
console.log(v.length>=4&&s.length>=8&&m.length>=4?'\x1b[32mCOMPLEX PASS\x1b[0m':'\x1b[31mCOMPLEX FAIL\x1b[0m');
traceCleanup();
ENDJS
node $B/t.mjs
rm -rf $B
echo $'\x1b[32mComplex done.\x1b[0m'
```
