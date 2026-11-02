# Proposal: fix 1 for add-web-flow-graph

## Why
The verifier found problems in `add-web-flow-graph` that this change fixes. The findings are listed below with their ids; each task of this change names the ones it answers.

## What Changes
- F-22a9abae, F-7e9a81fb (blocker): e2e gate failed (+1 more): `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` failed: exit code 1; failing: test_m3_authoring::test_c_2619a93b_alice_creates_a_flow_from_yaml_and_reads_its_graph(chromium), test_m3_authoring::test_c_68b2dc11_bob_reads_the_graph_but_cannot_save(chromium) | new tests failed: test_m3_authoring::test_c_2619a93b_alice_creates_a_flow_from_yaml_and_reads_its_graph(chromium), test_m3_authoring::test_c_68b2dc11_bob_reads_the_graph_but_cannot_save(chromium)

## Impact
The code and the tests of `add-web-flow-graph`.
