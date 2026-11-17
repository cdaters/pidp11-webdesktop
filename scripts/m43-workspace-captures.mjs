import {chromium} from '@playwright/test';
const b=await chromium.launch(),p=await b.newPage({viewport:{width:1600,height:1000},deviceScaleFactor:2});
try{
 await p.goto('http://127.0.0.1:5173/');await p.getByRole('button',{name:'Open Terminal',exact:true}).click();await p.getByRole('button',{name:'Arrange terminals',exact:true}).click();
 await p.locator('[data-window="terminal-2"] .xterm').waitFor();await p.screenshot({path:'docs/screenshots/m43-arranged-retina.png'});
 await p.getByRole('button',{name:'Open Disk drives',exact:true}).click();await p.locator('[data-mount="RL0"]').click();await p.screenshot({path:'docs/screenshots/m43-devices.png'});
 await p.setViewportSize({width:390,height:844});await p.reload();await p.getByRole('button',{name:'Open Front panel',exact:true}).click();await p.screenshot({path:'docs/screenshots/m43-mobile-panel.png'});
}finally{await b.close()}
