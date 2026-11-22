# Independent review intake

Independent security review is **pending**. No outside findings or approval have
been supplied for M5.17. This directory provides a process, not an audit record.
Start with the [M5.16 packet](../M5.16-review.md); use the exact revision in the
candidate's `SOURCE.json`, and state any difference from the packet's pinned tree.

1. Craig chooses a reviewer and approves the invitation below before sending it.
   Do not publish sensitive reports through a public issue. Follow [SECURITY.md](../../../SECURITY.md).
2. Copy [the finding form](finding-template.md) to a private location. Give each
   actual finding an identifier, such as REVIEW-001. Record attribution only with
   the reviewer's consent; anonymous reports are useful too.
3. Preserve the original report and evidence unchanged. Reproduce using disposable
   fixtures or authorized media. Record environment, exact revision, expected and
   observed behavior, and whether reproduction succeeded. Do not acquire new
   physical access or replay uncertain guest operations as an intake side effect.
4. Assess impact separately from confidence. Record severity and its rationale,
   reachability, required privileges and affected modes. A historical-emulation
   defect and an authorization defect have different consequences.
5. Add a focused failing regression before a justified correction. Keep existing
   authorization/resource limits. Verify the correction and affected integration
   boundaries, then give the reviewer the new revision and actual evidence.
6. Close only with an explicit disposition: corrected and verified, accepted limit,
   duplicate, not reproduced, or withdrawn. Record residual uncertainty and who
   accepted the disposition. Invite confirmation; do not invent reviewer sign-off.

Suggested states: received → triaged → reproduced / investigation pending →
correction proposed → verified → closed. A report that cannot be reproduced stays
visible with its limits; successful unrelated tests do not close it.

## Invitation draft — not sent

Would you be willing to review the authorization and lifecycle boundaries of
PiDP-11 Web Desktop's Source Alpha 2 candidate? It is an optional Go/TypeScript
companion for local demonstrations and controlled historical-computing labs,
not an approved physical Pi installation. The compact M5.16 packet maps 21
invariants to source and 47 named tests; the candidate record identifies the exact
archive and revision to review. No Pi, historical disk or model is needed for the
initial checks. We especially welcome challenges to consent/revocation, guest-line
approval, process/socket identity and bounded resources. Please report the exact
revision, reproduction and remaining uncertainty using the linked form, keeping
sensitive evidence private. Passing tests are not independent certification.

Before sending, Craig should insert the final candidate record/link and agree on
a private channel. No response deadline or endorsement is assumed.

## Reviewer checklist

- Confirm candidate checksum and revision; distinguish fixtures from Linux/guest evidence.
- Reproduce a refusal as well as success; challenge the assumptions listed per invariant.
- Trace authority through the final input write or selected-text read.
- Examine races involving replacement, cancellation, expiration and retained text.
- Check actual memory enforcement and independent conventional-console operation.
- Record untested areas and findings; never treat a source citation as factual certification.
