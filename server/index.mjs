import { createApp } from './app.mjs'; const port=Number(process.env.PORT||3000); createApp().listen(port,'0.0.0.0',()=>console.log(`gReader web listening on ${port}`));
