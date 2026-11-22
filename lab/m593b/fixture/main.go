// Explicit deterministic runner fixture for disposable ARM64 transport tests.
package main
import("net/http";"io";"log")
func main(){http.HandleFunc("POST /api/chat",func(w http.ResponseWriter,r *http.Request){io.WriteString(w,`{"done":true,"message":{"content":"DETERMINISTIC TRANSPORT FIXTURE; no model"}}`)});log.Fatal(http.ListenAndServe("127.0.0.1:19191",nil))}
