# Communications session contract

## M5.27 qualified extension

The M5.26 echo/raw-mode limitations below describe that milestone's observations.
M5.27 diagnosed the matching cu source/binary and established a legitimate stty
workaround, repeated text-file integrity and a separate bounded local modem.
The [local modem contract](local-modem.md) adds an independent actor and read-only
status window without changing ordinary terminal endpoint authority. Original cu,
SIMH and media remain unmodified; broader binary/carrier/flow-control claims remain
unqualified. See [M5.27](../lab/M5.27.md).


M5.26 extends the existing [supervised guest attachment](supervised-guest-identity.md)
and terminal ownership contracts. It creates no second dialing or authority path.
The Communications window is a filtered view of ordinary approved terminal lines.
The [engineering report](../lab/M5.26.md) defines the genuine V7/DC11 evidence.

## Optional operator configuration

The existing endpoint entry accepts this optional `serial` object. Values are
operator assertions; none is a command, hostname or inferred guest identity.

```json
{
  "simulator": "example-instance-0001",
  "guest": "UNIX V7",
  "controller": "DC11",
  "unit": 0,
  "line": 3,
  "guest_device": "/dev/tty03",
  "application": "/bin/cu (text; echo and newline transformations)",
  "peer": "Approved local browser endpoint",
  "framing": "ascii7-raw-socket"
}
```

The independent operator must verify these labels against the actual simulator,
guest driver and application before approval. The server permits DC11 unit 0,
lines 0–15 with matching device spelling. Only line 3 has new M5.26 application
evidence. Labels are bounded printable ASCII; simulator IDs are 16–64 bounded
identifier characters. Arbitrary controller names, incompatible devices and unknown
framing are rejected. A profile does not make an unapproved endpoint attachable.

The public directory exposes this metadata beside endpoint ID, attachment state
and generation. The browser offers only valid profiles with explicit generations
in Communications. It connects to that generation, not an address typed by a user.
The ordinary Guest terminal continues to support endpoints without serial metadata.
No new interoperability contract or simulator modification is involved.

## Accounting and freshness

A state frame for a profiled endpoint includes `serial`:

| Field | Meaning |
| --- | --- |
| `received` | Actual bytes read from this attachment's host socket, including echoes; not guaranteed to originate in the intended guest application |
| `written` | Bytes accepted by host socket writes, including a prefix before failure; not a guest-consumption receipt |
| `capped` | At least one total reached the maximum exact JSON integer; subsequent totals are lower bounds |
| `pending` | This viewer's unacknowledged output bytes, not a UART FIFO |
| `sample_unix_ms` | Server sample time for audit; visible freshness uses local elapsed receipt time |

Totals belong to one `Endpoint` lifetime and saturate at 2^53−1. They do not
carry over to a replacement attachment. Read-only `status` returns a sample;
it neither acquires nor renews the ten-second keyboard lease. The browser polls
once per second only for a selected serial profile and marks a sample unknown
after three seconds or transport loss. Last-known counts remain labeled.
The existing disconnect message records why the current view stopped; no
historical transcript or growing sample database is added.

Ownership still uses explicit acquire/release, epoch, ordered input sequence,
capability checks and lease expiry. Existing credit, input-rate and write-timeout
limits apply. Observer status polling can exhaust its own bounded output queue;
it cannot bypass viewer bounds or extend writer authority. The renderer owns and
cancels its timer, socket and subscriptions. A reconnect is a fresh parser/view
and starts read-only. Browser close does not detach or stop the guest.

## Retirement and uncertainty

Only the independent local operator approves/revokes attachments. The optional
Linux observer pins process and socket lifetime. Listener replacement, missing
renewals and service restart retire old approval; a new service starts detached.
A guest OS change inside an unchanged process/socket is still not detectable.
Stop the actual bridge before an intentional guest change, then independently
verify the new guest and issue fresh approval. Metadata is not a workaround.

No carrier, DTR, DSR, CTS, RTS, baud timing or guest execution state is inferred
from a connected TCP socket. The lab modem's command/data state is separate from
emulated DC11 modem-control registers. Guest canonical processing, echo, newline
translation and flow control can change or defer data. In the observed V7 `cu`
state, browser CR alone did not complete a line; explicit Line feed did. A byte
counter increase is not permission to replay an apparently unanswered command.
