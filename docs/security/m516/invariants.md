# Security invariant reference

Review tree: `87bc750543154f65489f91413ce33ceda0b6f6e5`. Production behavior remains at the M5.15 integration tree `c39647975fbf573e14c8bd4a16b8f017df3597b9`.

Each case below states a promise, exact implementation/test references, reproduction, remaining limit and an assumption that can invalidate it. These are implementer assertions for review, not independent approval. The [manifest](invariants.json) and [runner](../../../lab/m516/review_checks.py) check that all named tests actually exist.

## authentication

Provisioned capabilities, exact Origin and CSRF separate observers from writers.

Implementation: [internal/access/access.go](https://github.com/cdaters/pidp11-webdesktop/blob/87bc750543154f65489f91413ce33ceda0b6f6e5/internal/access/access.go).

Tests:
- [`TestIndependentCapabilitiesCSRFAndExpiry`](https://github.com/cdaters/pidp11-webdesktop/blob/87bc750543154f65489f91413ce33ceda0b6f6e5/internal/access/access_test.go)
- [`TestMalformedOriginCredentialsAndBounds`](https://github.com/cdaters/pidp11-webdesktop/blob/87bc750543154f65489f91413ce33ceda0b6f6e5/internal/access/access_test.go)

Mac/development shell:

```sh
go test -race -count=1 ./internal/access -run '^(TestIndependentCapabilitiesCSRFAndExpiry|TestMalformedOriginCredentialsAndBounds)$' -v
```

**Evidence:** deterministic fixtures unless the packet names an executed Linux check.

**Limit:** TLS trust and credential provisioning are external.

**Invalidated by:** Compromised browser/host, stolen credentials or incorrect configured Origin.

## sessions

Secure bounded sessions expire and can be revoked; audit omits credential text.

Implementation: [internal/access/access.go](https://github.com/cdaters/pidp11-webdesktop/blob/87bc750543154f65489f91413ce33ceda0b6f6e5/internal/access/access.go).

Tests:
- [`TestSecureOriginCookiesRevocationAndAudit`](https://github.com/cdaters/pidp11-webdesktop/blob/87bc750543154f65489f91413ce33ceda0b6f6e5/internal/access/secure_test.go)
- [`TestSlowLoginDoesNotHoldSessionLock`](https://github.com/cdaters/pidp11-webdesktop/blob/87bc750543154f65489f91413ce33ceda0b6f6e5/internal/access/secure_test.go)

Mac/development shell:

```sh
go test -race -count=1 ./internal/access -run '^(TestSecureOriginCookiesRevocationAndAudit|TestSlowLoginDoesNotHoldSessionLock)$' -v
```

**Evidence:** deterministic fixtures unless the packet names an executed Linux check.

**Limit:** Already delivered bytes are not recalled.

**Invalidated by:** Caller bypasses Gate or fails to close an expired transport.

## attachment

Service starts detached; exact instance/revision approval is consumed once.

Implementation: [internal/terminalservice/lifecycle.go](https://github.com/cdaters/pidp11-webdesktop/blob/87bc750543154f65489f91413ce33ceda0b6f6e5/internal/terminalservice/lifecycle.go).

Tests:
- [`TestDetachedAndGenerationFences`](https://github.com/cdaters/pidp11-webdesktop/blob/87bc750543154f65489f91413ce33ceda0b6f6e5/internal/terminalservice/lifecycle_test.go)
- [`TestDetachDuringDial`](https://github.com/cdaters/pidp11-webdesktop/blob/87bc750543154f65489f91413ce33ceda0b6f6e5/internal/terminalservice/lifecycle_test.go)
- [`TestGuestEOFRetiresAndConsumesApproval`](https://github.com/cdaters/pidp11-webdesktop/blob/87bc750543154f65489f91413ce33ceda0b6f6e5/internal/terminalservice/lifecycle_test.go)

Mac/development shell:

```sh
go test -race -count=1 ./internal/terminalservice -run '^(TestDetachedAndGenerationFences|TestDetachDuringDial|TestGuestEOFRetiresAndConsumesApproval)$' -v
```

**Evidence:** deterministic fixtures unless the packet names an executed Linux check.

**Limit:** Approval is a trusted operator assertion.

**Invalidated by:** Operator approves the wrong guest line or its process changes without observable identity loss.

## verification

A supervised connection remains unpublished until connected-socket proof; expiry retires it.

Implementation: [internal/terminalservice/supervision.go](https://github.com/cdaters/pidp11-webdesktop/blob/87bc750543154f65489f91413ce33ceda0b6f6e5/internal/terminalservice/supervision.go).

Tests:
- [`TestSupervisionRequiresConnectedSocketVerification`](https://github.com/cdaters/pidp11-webdesktop/blob/87bc750543154f65489f91413ce33ceda0b6f6e5/internal/terminalservice/supervision_test.go)
- [`TestSupervisionExpiryPermanentlyRetiresOldEndpoint`](https://github.com/cdaters/pidp11-webdesktop/blob/87bc750543154f65489f91413ce33ceda0b6f6e5/internal/terminalservice/supervision_test.go)
- [`TestSupervisionExpiresWhileDialBlocked`](https://github.com/cdaters/pidp11-webdesktop/blob/87bc750543154f65489f91413ce33ceda0b6f6e5/internal/terminalservice/supervision_test.go)

Mac/development shell:

```sh
go test -race -count=1 ./internal/terminalservice -run '^(TestSupervisionRequiresConnectedSocketVerification|TestSupervisionExpiryPermanentlyRetiresOldEndpoint|TestSupervisionExpiresWhileDialBlocked)$' -v
```

**Evidence:** deterministic fixtures unless the packet names an executed Linux check.

**Limit:** Not a hard real-time guarantee or CPU-stop mechanism.

**Invalidated by:** A trusted observer lies, accepts inherited descriptors incorrectly or stops receiving CPU time.

## ordered-renewal

Only the exact next sequence can renew; concurrent contenders have one winner.

Implementation: [internal/terminalservice/supervision.go](https://github.com/cdaters/pidp11-webdesktop/blob/87bc750543154f65489f91413ce33ceda0b6f6e5/internal/terminalservice/supervision.go).

Tests:
- [`TestConcurrentRenewalHasOnlyOneWinner`](https://github.com/cdaters/pidp11-webdesktop/blob/87bc750543154f65489f91413ce33ceda0b6f6e5/internal/terminalservice/supervision_test.go)
- [`TestMalformedRenewalCannotConsumeOrPublishApproval`](https://github.com/cdaters/pidp11-webdesktop/blob/87bc750543154f65489f91413ce33ceda0b6f6e5/internal/terminalservice/supervision_test.go)

Mac/development shell:

```sh
go test -race -count=1 ./internal/terminalservice -run '^(TestConcurrentRenewalHasOnlyOneWinner|TestMalformedRenewalCannotConsumeOrPublishApproval)$' -v
```

**Evidence:** deterministic fixtures unless the packet names an executed Linux check.

**Limit:** Local operator/observer credentials remain trusted.

**Invalidated by:** An attacker controls the private socket or approved observer.

## keyboard

Observation grants no keyboard lease; expiry/disconnect does not replay input.

Implementation: [internal/terminalbridge/bridge.go](https://github.com/cdaters/pidp11-webdesktop/blob/87bc750543154f65489f91413ce33ceda0b6f6e5/internal/terminalbridge/bridge.go).

Tests:
- [`TestOwnershipOrderingExpiryAndNoReplay`](https://github.com/cdaters/pidp11-webdesktop/blob/87bc750543154f65489f91413ce33ceda0b6f6e5/internal/terminalbridge/bridge_test.go)
- [`TestLeaseExpiresWithoutInjectingBytes`](https://github.com/cdaters/pidp11-webdesktop/blob/87bc750543154f65489f91413ce33ceda0b6f6e5/internal/terminalbridge/bridge_test.go)
- [`TestHTTPAuthorizationAndDisconnect`](https://github.com/cdaters/pidp11-webdesktop/blob/87bc750543154f65489f91413ce33ceda0b6f6e5/internal/terminalbridge/bridge_test.go)

Mac/development shell:

```sh
go test -race -count=1 ./internal/terminalbridge -run '^(TestOwnershipOrderingExpiryAndNoReplay|TestLeaseExpiresWithoutInjectingBytes|TestHTTPAuthorizationAndDisconnect)$' -v
```

**Evidence:** deterministic fixtures unless the packet names an executed Linux check.

**Limit:** Bytes sent before revocation can already affect the guest.

**Invalidated by:** A guest terminal line is mistakenly wired to an operator monitor.

## replacement

Late reader output and replacement listeners cannot revive a retired bridge.

Implementation: [internal/terminalbridge/bridge.go](https://github.com/cdaters/pidp11-webdesktop/blob/87bc750543154f65489f91413ce33ceda0b6f6e5/internal/terminalbridge/bridge.go).

Tests:
- [`TestReplacementListenerRequiresFreshBridge`](https://github.com/cdaters/pidp11-webdesktop/blob/87bc750543154f65489f91413ce33ceda0b6f6e5/internal/terminalbridge/lifecycle_test.go)
- [`TestDetachedReaderCannotPublishBufferedOutput`](https://github.com/cdaters/pidp11-webdesktop/blob/87bc750543154f65489f91413ce33ceda0b6f6e5/internal/terminalbridge/lifecycle_test.go)

Mac/development shell:

```sh
go test -race -count=1 ./internal/terminalbridge -run '^(TestReplacementListenerRequiresFreshBridge|TestDetachedReaderCannotPublishBufferedOutput)$' -v
```

**Evidence:** deterministic fixtures unless the packet names an executed Linux check.

**Limit:** An OS change within the surviving stream is invisible.

**Invalidated by:** Reuse of a generation outside the manager contract.

## viewer-membership

Same-count replacement changes the viewer membership identity.

Implementation: [internal/terminalbridge/bridge.go](https://github.com/cdaters/pidp11-webdesktop/blob/87bc750543154f65489f91413ce33ceda0b6f6e5/internal/terminalbridge/bridge.go).

Tests:
- [`TestObservationDistinguishesSameCountReplacement`](https://github.com/cdaters/pidp11-webdesktop/blob/87bc750543154f65489f91413ce33ceda0b6f6e5/internal/terminalbridge/observation_test.go)

Mac/development shell:

```sh
go test -race -count=1 ./internal/terminalbridge -run '^(TestObservationDistinguishesSameCountReplacement)$' -v
```

**Evidence:** deterministic fixtures unless the packet names an executed Linux check.

**Limit:** The single-view guard is a lab policy; normal terminal supports multiple observers.

**Invalidated by:** A consumer tracks counts only, or treats a callback as independent OS identification.

## bounded-transport

Inputs, credits, stalled writes and connection counts remain bounded.

Implementation: [internal/terminalbridge/bridge.go](https://github.com/cdaters/pidp11-webdesktop/blob/87bc750543154f65489f91413ce33ceda0b6f6e5/internal/terminalbridge/bridge.go).

Tests:
- [`TestBoundsAndMalformedInput`](https://github.com/cdaters/pidp11-webdesktop/blob/87bc750543154f65489f91413ce33ceda0b6f6e5/internal/terminalbridge/bridge_test.go)
- [`TestInputRateLimitAndRecovery`](https://github.com/cdaters/pidp11-webdesktop/blob/87bc750543154f65489f91413ce33ceda0b6f6e5/internal/terminalbridge/bridge_test.go)
- [`TestStalledWriteIsBoundedAndNeverReplayed`](https://github.com/cdaters/pidp11-webdesktop/blob/87bc750543154f65489f91413ce33ceda0b6f6e5/internal/terminalbridge/bridge_test.go)

Mac/development shell:

```sh
go test -race -count=1 ./internal/terminalbridge -run '^(TestBoundsAndMalformedInput|TestInputRateLimitAndRecovery|TestStalledWriteIsBoundedAndNeverReplayed)$' -v
```

**Evidence:** deterministic fixtures unless the packet names an executed Linux check.

**Limit:** Host-level exhaustion and arbitrary adversarial load are not fully qualified.

**Invalidated by:** Callers bypass the bounded handler or future limits are removed.

## listeners

Listener capacity is released when connections close.

Implementation: [internal/terminalservice/listener.go](https://github.com/cdaters/pidp11-webdesktop/blob/87bc750543154f65489f91413ce33ceda0b6f6e5/internal/terminalservice/listener.go).

Tests:
- [`TestListenerBoundsAndReleases`](https://github.com/cdaters/pidp11-webdesktop/blob/87bc750543154f65489f91413ce33ceda0b6f6e5/internal/terminalservice/control_test.go)

Mac/development shell:

```sh
go test -race -count=1 ./internal/terminalservice -run '^(TestListenerBoundsAndReleases)$' -v
```

**Evidence:** deterministic fixtures unless the packet names an executed Linux check.

**Limit:** This is one resource bound, not complete denial-of-service assurance.

**Invalidated by:** An outer proxy accepts unbounded work.

## epochs

Revocation fences pending and pre-HTTP publication; concurrent epoch use has one winner.

Implementation: [internal/replicant/http.go](https://github.com/cdaters/pidp11-webdesktop/blob/87bc750543154f65489f91413ce33ceda0b6f6e5/internal/replicant/http.go).

Tests:
- [`TestRevokeFencesPendingPublication`](https://github.com/cdaters/pidp11-webdesktop/blob/87bc750543154f65489f91413ce33ceda0b6f6e5/internal/replicant/lifecycle_race_test.go)
- [`TestRevokeFencesPublicationPreparedBeforeHTTPRequest`](https://github.com/cdaters/pidp11-webdesktop/blob/87bc750543154f65489f91413ce33ceda0b6f6e5/internal/replicant/lifecycle_race_test.go)
- [`TestConcurrentPublicationsConsumeOneEpoch`](https://github.com/cdaters/pidp11-webdesktop/blob/87bc750543154f65489f91413ce33ceda0b6f6e5/internal/replicant/lifecycle_race_test.go)

Mac/development shell:

```sh
go test -race -count=1 ./internal/replicant -run '^(TestRevokeFencesPendingPublication|TestRevokeFencesPublicationPreparedBeforeHTTPRequest|TestConcurrentPublicationsConsumeOneEpoch)$' -v
```

**Evidence:** deterministic fixtures unless the packet names an executed Linux check.

**Limit:** Epoch starts at status observation, not the user click.

**Invalidated by:** Client silently obtains a fresh epoch and retries without renewed consent.

## receipts

Every publication gets a distinct receipt; malformed input cannot replace selection.

Implementation: [internal/replicant/sharing.go](https://github.com/cdaters/pidp11-webdesktop/blob/87bc750543154f65489f91413ce33ceda0b6f6e5/internal/replicant/sharing.go).

Tests:
- [`TestSelectionReceiptChangesOnEveryPublication`](https://github.com/cdaters/pidp11-webdesktop/blob/87bc750543154f65489f91413ce33ceda0b6f6e5/internal/replicant/sharing_test.go)
- [`TestSharingMalformedRequestsCannotReplaceSelection`](https://github.com/cdaters/pidp11-webdesktop/blob/87bc750543154f65489f91413ce33ceda0b6f6e5/internal/replicant/sharing_test.go)

Mac/development shell:

```sh
go test -race -count=1 ./internal/replicant -run '^(TestSelectionReceiptChangesOnEveryPublication|TestSharingMalformedRequestsCannotReplaceSelection)$' -v
```

**Evidence:** deterministic fixtures unless the packet names an executed Linux check.

**Limit:** Legacy /screen permits absent receipt; current clients check exact returned receipt.

**Invalidated by:** A consumer ignores the receipt or includes saved excerpts without fresh approval.

## model-gateway

Separate TLS credential and fixed model; no management/tools, queued inference or automatic retry.

Implementation: [internal/modelhost/gateway.go](https://github.com/cdaters/pidp11-webdesktop/blob/87bc750543154f65489f91413ce33ceda0b6f6e5/internal/modelhost/gateway.go).

Tests:
- [`TestAuthenticatedTLSAndNoManagement`](https://github.com/cdaters/pidp11-webdesktop/blob/87bc750543154f65489f91413ce33ceda0b6f6e5/internal/modelhost/gateway_test.go)
- [`TestCancellationAndBusyDoNotQueue`](https://github.com/cdaters/pidp11-webdesktop/blob/87bc750543154f65489f91413ce33ceda0b6f6e5/internal/modelhost/gateway_test.go)
- [`TestGatewayQuotationAndDurableAttribution`](https://github.com/cdaters/pidp11-webdesktop/blob/87bc750543154f65489f91413ce33ceda0b6f6e5/internal/modelhost/gateway_test.go)

Mac/development shell:

```sh
go test -race -count=1 ./internal/modelhost -run '^(TestAuthenticatedTLSAndNoManagement|TestCancellationAndBusyDoNotQueue|TestGatewayQuotationAndDurableAttribution)$' -v
```

**Evidence:** deterministic fixtures unless the packet names an executed Linux check.

**Limit:** A runner may retain submitted data or continue after cancellation.

**Invalidated by:** Gateway is pointed at an untrusted provider or its credential is leaked.

## tutor-attribution

Every delivered explanation is qualified; marked unsupported quotations are withheld.

Implementation: [internal/companion/attribution.go](https://github.com/cdaters/pidp11-webdesktop/blob/87bc750543154f65489f91413ce33ceda0b6f6e5/internal/companion/attribution.go).

Tests:
- [`TestQuotationCannotBorrowParaphraseAuthority`](https://github.com/cdaters/pidp11-webdesktop/blob/87bc750543154f65489f91413ce33ceda0b6f6e5/internal/companion/attribution_test.go)
- [`TestEveryModelAnswerCarriesSourceStatus`](https://github.com/cdaters/pidp11-webdesktop/blob/87bc750543154f65489f91413ce33ceda0b6f6e5/internal/companion/attribution_test.go)
- [`TestCitationCannotSuppressSourceQualification`](https://github.com/cdaters/pidp11-webdesktop/blob/87bc750543154f65489f91413ce33ceda0b6f6e5/internal/companion/attribution_test.go)

Mac/development shell:

```sh
go test -race -count=1 ./internal/companion -run '^(TestQuotationCannotBorrowParaphraseAuthority|TestEveryModelAnswerCarriesSourceStatus|TestCitationCannotSuppressSourceQualification)$' -v
```

**Evidence:** deterministic fixtures unless the packet names an executed Linux check.

**Limit:** The label and quotation heuristic do not establish factual correctness.

**Invalidated by:** A consumer hides the label, or prose contains an unrecognized unsupported claim.

## peripheral-retirement

Unsafe producer change, retained-byte rewrite or completion mismatch retires observed bytes.

Implementation: [internal/peripheral/follow.go](https://github.com/cdaters/pidp11-webdesktop/blob/87bc750543154f65489f91413ce33ceda0b6f6e5/internal/peripheral/follow.go).

Tests:
- [`TestFollowRetiresOnUnsafeProducerChanges`](https://github.com/cdaters/pidp11-webdesktop/blob/87bc750543154f65489f91413ce33ceda0b6f6e5/internal/peripheral/follow_test.go)
- [`TestFollowingRevokesOnSameSizeWriteAndCompletionMismatch`](https://github.com/cdaters/pidp11-webdesktop/blob/87bc750543154f65489f91413ce33ceda0b6f6e5/internal/peripheral/follow_test.go)
- [`TestTruncateRegrowBetweenPollsRetiresObservedBytes`](https://github.com/cdaters/pidp11-webdesktop/blob/87bc750543154f65489f91413ce33ceda0b6f6e5/internal/peripheral/shutdown_test.go)

Mac/development shell:

```sh
go test -race -count=1 ./internal/peripheral -run '^(TestFollowRetiresOnUnsafeProducerChanges|TestFollowingRevokesOnSameSizeWriteAndCompletionMismatch|TestTruncateRegrowBetweenPollsRetiresObservedBytes)$' -v
```

**Evidence:** deterministic fixtures unless the packet names an executed Linux check.

**Limit:** Discarded history and malicious ancestor-directory changes are not authenticated.

**Invalidated by:** Untrusted producer lies about identity/completion or an ancestor owner replaces paths.

## peripheral-closure

Closed followers cannot reopen; observers receive exact authorized completed exports.

Implementation: [internal/peripheral/store.go](https://github.com/cdaters/pidp11-webdesktop/blob/87bc750543154f65489f91413ce33ceda0b6f6e5/internal/peripheral/store.go).

Tests:
- [`TestClosedFollowerCannotReopenOrRestart`](https://github.com/cdaters/pidp11-webdesktop/blob/87bc750543154f65489f91413ce33ceda0b6f6e5/internal/peripheral/shutdown_test.go)
- [`TestEmptyExportAndObserverIsolation`](https://github.com/cdaters/pidp11-webdesktop/blob/87bc750543154f65489f91413ce33ceda0b6f6e5/internal/peripheral/http_test.go)

Mac/development shell:

```sh
go test -race -count=1 ./internal/peripheral -run '^(TestClosedFollowerCannotReopenOrRestart|TestEmptyExportAndObserverIsolation)$' -v
```

**Evidence:** deterministic fixtures unless the packet names an executed Linux check.

**Limit:** Original CPU/device tests do not qualify an OS printer driver.

**Invalidated by:** A producer is incorrectly approved or caller bypasses generation checks.

## private-files

Private inputs reject unsafe types; control directory must belong to the service.

Implementation: [internal/terminalservice/control.go](https://github.com/cdaters/pidp11-webdesktop/blob/87bc750543154f65489f91413ce33ceda0b6f6e5/internal/terminalservice/control.go).

Tests:
- [`TestPrivateInputsAndControlSocket`](https://github.com/cdaters/pidp11-webdesktop/blob/87bc750543154f65489f91413ce33ceda0b6f6e5/internal/terminalservice/control_test.go)
- [`TestControlRejectsForeignOwner`](https://github.com/cdaters/pidp11-webdesktop/blob/87bc750543154f65489f91413ce33ceda0b6f6e5/internal/terminalservice/control_test.go)
- [`TestPrivateFileRejectsForeignOwner`](https://github.com/cdaters/pidp11-webdesktop/blob/87bc750543154f65489f91413ce33ceda0b6f6e5/internal/terminalservice/control_test.go)

Mac/development shell:

```sh
go test -race -count=1 ./internal/terminalservice -run '^(TestPrivateInputsAndControlSocket|TestControlRejectsForeignOwner|TestPrivateFileRejectsForeignOwner)$' -v
```

**Evidence:** deterministic fixtures unless the packet names an executed Linux check.

**Limit:** Foreign-owner mutation cases skip on Mac; separate root Linux run required. Trusted ancestors remain required.

**Invalidated by:** Root/ancestor owner is hostile, or provisioning gives another account directory control.

## memory

Mandatory installed-service guard refuses absent/excessive memory or swap containment.

Implementation: [internal/memoryguard/check.go](https://github.com/cdaters/pidp11-webdesktop/blob/87bc750543154f65489f91413ce33ceda0b6f6e5/internal/memoryguard/check.go).

Tests:
- [`TestContainmentEvidence`](https://github.com/cdaters/pidp11-webdesktop/blob/87bc750543154f65489f91413ce33ceda0b6f6e5/internal/memoryguard/check_test.go)

Mac/development shell:

```sh
go test -race -count=1 ./internal/memoryguard -run '^(TestContainmentEvidence)$' -v
```

**Evidence:** deterministic fixtures unless the packet names an executed Linux check.

**Limit:** Go soft target alone is insufficient. Physical Pi memory controller remains disabled/unqualified.

**Invalidated by:** Service launched without mandatory flag, altered unit or controller limits changed after the startup check.

## local-control

Malformed or stale local approvals fail; an occupied socket is preserved for explicit stopped recovery.

Implementation: [internal/terminalservice/control.go](https://github.com/cdaters/pidp11-webdesktop/blob/87bc750543154f65489f91413ce33ceda0b6f6e5/internal/terminalservice/control.go).

Tests:
- [`TestLocalControlRejectsMalformedAndStale`](https://github.com/cdaters/pidp11-webdesktop/blob/87bc750543154f65489f91413ce33ceda0b6f6e5/internal/terminalservice/control_test.go)
- [`TestStaleControlSocketRequiresExplicitStoppedRecovery`](https://github.com/cdaters/pidp11-webdesktop/blob/87bc750543154f65489f91413ce33ceda0b6f6e5/internal/terminalservice/control_test.go)

Mac/development shell:

```sh
go test -race -count=1 ./internal/terminalservice -run '^(TestLocalControlRejectsMalformedAndStale|TestStaleControlSocketRequiresExplicitStoppedRecovery)$' -v
```

**Evidence:** deterministic local socket fixtures.

**Limit:** Private directory ownership and trusted ancestors provide local authorization; no peer-user multi-tenant policy.

**Invalidated by:** Another account controls the socket parent or an operator deletes a live socket.

## provisioning

Handled failures remove only newly created material and preserve unexpected files.

Implementation: [cmd/webdesktop-service/provision.go](https://github.com/cdaters/pidp11-webdesktop/blob/87bc750543154f65489f91413ce33ceda0b6f6e5/cmd/webdesktop-service/provision.go).

Tests:
- [`TestProvisionWriteFailureCleansOnlyNewMaterial`](https://github.com/cdaters/pidp11-webdesktop/blob/87bc750543154f65489f91413ce33ceda0b6f6e5/cmd/webdesktop-service/provision_failure_test.go)
- [`TestProvisionCleanupPreservesUnexpectedFile`](https://github.com/cdaters/pidp11-webdesktop/blob/87bc750543154f65489f91413ce33ceda0b6f6e5/cmd/webdesktop-service/provision_failure_test.go)

Mac/development shell:

```sh
go test -race -count=1 ./cmd/webdesktop-service -run '^(TestProvisionWriteFailureCleansOnlyNewMaterial|TestProvisionCleanupPreservesUnexpectedFile)$' -v
```

**Evidence:** injected filesystem failures; retained M5.14 Linux file-size refusal.

**Limit:** Not atomic against SIGKILL, power loss or failed cleanup. Original exit-139 incidents remain unexplained.

**Invalidated by:** A host crash or hostile parent hierarchy defeats the handled-error assumptions.

## private-diagnostics

Invalid configuration diagnostics do not echo arbitrary private input.

Implementation: [cmd/webdesktop-service/main.go](https://github.com/cdaters/pidp11-webdesktop/blob/87bc750543154f65489f91413ce33ceda0b6f6e5/cmd/webdesktop-service/main.go).

Tests:
- [`TestInvalidConfigurationDoesNotEchoPrivateInput`](https://github.com/cdaters/pidp11-webdesktop/blob/87bc750543154f65489f91413ce33ceda0b6f6e5/cmd/webdesktop-service/provision_failure_test.go)

Mac/development shell:

```sh
go test -race -count=1 ./cmd/webdesktop-service -run '^(TestInvalidConfigurationDoesNotEchoPrivateInput)$' -v
```

**Evidence:** secret-canary fixture; source review of error paths.

**Limit:** Not a universal proof of zero sensitive logging. Explicit lab captures, downloads, browser history and provider retention are separate stores.

**Invalidated by:** Future logging prints requests, private config, console content or provider errors without review.

