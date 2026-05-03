import { init } from "@plausible-analytics/tracker";

init({
  domain: "app.upcomi.cc",
  outboundLinks: true,
  fileDownloads: true,
  formSubmissions: false,
});
