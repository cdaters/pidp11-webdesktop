"""Exact, fail-closed patch application to a disposable copy, never cached upstream."""
import pathlib,sys
root=pathlib.Path(sys.argv[1])
def edit(name,old,new):
 p=root/name;s=p.read_text()
 if name=='scp.c' and ('get_glyph_cmd' in old or 'stat_nomessage = stat' in old):
  start=s.index('t_stat process_stdin_commands (t_stat stat, char *argv[])\n{');end=s.index('/* Set prompt routine */',start)
  part=s[start:end];assert part.count(old)==1;(p.write_text(s[:start]+part.replace(old,new)+s[end:]));return
 assert s.count(old)==1,(name,old,s.count(old));p.write_text(s.replace(old,new))
edit('scp.c','#include "sim_defs.h"','#include "sim_defs.h"\n#include "wd_fence.c"')
edit('scp.c','    cptr = get_glyph_cmd (cptr, gbuf);                  /* get command glyph */','    if (!wd_dispatch(&cptr)) { printf("WD rejected stale panel command\\n"); continue; }\n    cptr = get_glyph_cmd (cptr, gbuf);                  /* get command glyph */')
edit('scp.c','    stat_nomessage = stat & SCPE_NOMESSAGE;             /* extract possible message supression flag */','    wd_dispatch_end();\n    stat_nomessage = stat & SCPE_NOMESSAGE;             /* extract possible message supression flag */')
edit('scp.c','sim_is_running = TRUE;                                  /* flag running */','sim_is_running = TRUE;                                  /* flag running */\nwd_run_begin();')
edit('scp.c','sim_is_running = FALSE;                                 /* flag idle */','sim_is_running = FALSE;                                 /* flag idle */\nwd_run_end();')
edit('scp.c','\t\t\tif (s && *s) {','\t\t\tif (s && *s) {\n                s = wd_ticket(s);')
p=root/'REALCONS/realcons.c';s=p.read_text();p.write_text('#include "../wd_fence.h"\n'+s)
edit('REALCONS/realcons.c','\t///// Time for next service operation /////','\t///// Time for next service operation /////\n    uint64_t wd_g = wd_sample();')
edit('REALCONS/realcons.c','\t\t// 2) process console state. operates only "panel" model data struct','''        int wd_valid = wd_service_begin(wd_g);
        if (!wd_valid || wd_queue_changed()) _this->simh_cmd_buffer[0] = 0;
        if (!wd_valid) {
            unsigned wd_i;
            _this->simh_cmd_buffer[0] = 0;
            for (wd_i=0; wd_i<_this->console_model->controls_count; ++wd_i) {
                blinkenlight_control_t *c = &_this->console_model->controls[wd_i];
                if (!c->is_input) continue;
                if (!strcmp(c->name,"HALT") || !strcmp(c->name,"POWER")) c->value = 1;
                else if (!strcmp(c->name,"START") || !strcmp(c->name,"CONT") || !strcmp(c->name,"LOAD_ADRS") || !strcmp(c->name,"EXAM") || !strcmp(c->name,"DEPOSIT") || !strcmp(c->name,"PANEL_LOCK")) c->value = 0;
                c->value_previous = c->value; /* no artificial falling START edge */
            }
        }
\t\t// 2) process console state. operates only "panel" model data struct''')
edit('REALCONS/realcons.c','\t\t_this->console_controller_interface.service_func(_this->console_controller);','\t\t_this->console_controller_interface.service_func(_this->console_controller);\n        wd_service_end();')
p=root/'PDP11/pdp11_cpu.c';s=p.read_text();p.write_text('#include "../wd_fence.h"\n'+s)
edit('PDP11/pdp11_cpu.c','    realcons_service(cpu_realcons, 1); // high speed call','    if (wd_guard && wd_cpu_stop()) { reason = SCPE_STOP; break; }\n    realcons_service(cpu_realcons, 1); // high speed call\n    if (wd_guard && wd_cpu_stop()) { reason = SCPE_STOP; break; }')

edit('PDP11/pdp11_cpu.c','t_stat sim_instr (void)\n{','t_stat sim_instr (void)\n{\n    const int wd_guard = wd_enabled();')
