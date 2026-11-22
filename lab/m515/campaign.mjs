// Exclusive lease for cooperating guest-test campaigns, not guest authority.
// Never reclaim a stale lock automatically: inspect the prior process and guest.
import {openSync, closeSync, fstatSync, lstatSync, unlinkSync, writeFileSync} from 'node:fs';
export function acquireCampaign(root) {
  const path=root+'/.campaign.lock';
  let fd;
  try {fd=openSync(path,'wx',0o600);} catch {throw Error('Guest campaign already locked; inspect without replaying');}
  const identity=fstatSync(fd);
  writeFileSync(fd,String(process.pid)+'\n');
  return () => {
    closeSync(fd);
    const current=lstatSync(path);
    if(current.dev!==identity.dev || current.ino!==identity.ino) throw Error('Campaign lock changed; preserve it');
    unlinkSync(path);
  };
}
