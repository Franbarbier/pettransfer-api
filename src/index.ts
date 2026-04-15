import { createApp } from "./server/app";
import { settings } from "./settings";

const app = createApp();

app.listen(settings.PORT, () => {
  console.log(`API listening on http://localhost:${settings.PORT}`);
});
