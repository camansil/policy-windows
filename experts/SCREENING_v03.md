# Re-screening brief (criteria v0.3, set by the reviewer on 19 Nov 2026)

A record is IN only when BOTH are true, judged on the title and abstract:

1. **Empirical research conducted in Chile.** The study collects or analyses data (quantitative, qualitative, mixed, evaluation, survey, interviews, administrative data, systematic document analysis, modelling with Chilean data) and the data come from Chile (Chile alone, or one of a few compared countries with its own data). Essays, theory, commentaries, reviews of literature without Chilean data, and studies only mentioning Chile are OUT.
2. **Explicit mention of relevance for public policy or programmes.** The abstract itself says the findings matter for a policy, a law, a regulation, a public programme or service, or public decision-making (for example "implications for policy", "should inform the design of", "recommendations for the programme", "evaluates the X programme", "contributes to the debate on the reform"). A study that is merely ON a policy topic but never draws a policy implication or studies a policy/programme is OUT under this criterion.

Output one JSON object per input line, same order:
{"rid":"R0001","empirical_chile":true|false,"policy_explicit":true|false,"decision":"in|out","evidence":"<= 20 words quoted or closely paraphrased from the abstract showing the policy relevance, or why not"}

`decision` is "in" only if both are true. Write only the JSON lines to the output path given. Then reply with counts (in/out) and any problems.
