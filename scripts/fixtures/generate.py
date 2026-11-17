"""Rebuild offline fixtures on macOS from the pinned original generated C codec."""
import hashlib,json,pathlib,subprocess,tempfile
root=pathlib.Path(__file__).resolve().parents[2]
src=root/'scripts/fixtures'
with tempfile.TemporaryDirectory() as tmp:
 out=pathlib.Path(tmp)/'oracle'
 subprocess.run(['clang','-Wno-deprecated-declarations','-Wno-incompatible-function-pointer-types','-I'+str(src/'original'),str(src/'oracle.c'),str(src/'original/rpc_blinkenlight_api_xdr.c'),'-o',str(out)],check=True)
 lines=subprocess.check_output([str(out)],text=True).splitlines()
 fixtures=dict(line.split(' ',1) for line in lines)
 # RemoteTea XdrEncodingStream.xdrEncodeByteVector sign-extends each Java byte.
 # This variant is source-derived, NOT a claim of executing a JVM oracle.
 raw=bytearray.fromhex(fixtures['values'])
 for i in range(8,len(raw),4):
  if raw[i+3]>=128:raw[i:i+3]=b'\xff'*3
 fixtures['values_java_source_derived']=raw.hex()
 (root/'internal/blinkenbone/testdata/original.json').write_text(json.dumps(fixtures,indent=2)+'\n')
 manifest={'repository':'obsolescence/pidp11','revision':'26d20beda0c6b5a1d3a5cb3d7a4dd494e02bff75','generator':'macOS system libRPC XDR + unmodified upstream generated C','files':{str(p.relative_to(root)):hashlib.sha256(p.read_bytes()).hexdigest() for p in (src/'original').iterdir()}}
 (root/'scripts/fixtures/provenance.json').write_text(json.dumps(manifest,indent=2)+'\n')
 print('Generated',len(fixtures),'offline vectors')
