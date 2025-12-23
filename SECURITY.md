# Security Policy
This project currently evaluates user expressions with `new Function(...)` for
convenience. Do NOT host this on a public-facing site without replacing the
evaluator with a safe math parser (e.g., mathjs or a custom expression parser).
