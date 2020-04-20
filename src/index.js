import React from "react";
import ReactDOM from "react-dom";
import "./index.css";
import App from "./App";
import * as serviceWorker from "./serviceWorker";
import authAzAdB2c from "./react-adb2c-helper";

authAzAdB2c.initialize({
  applicationId: "de19ce62-33f2-4b56-9f53-904b5af3fb89",
  instance: "https://poluspoc.b2clogin.com/",
  tenant: "poluspoc",
  signInPolicy: "B2C_1_signin_login_v2",
  resetPolicy: "B2C_1_Pass_Reset",
  cacheLocation: "sessionStorage",
  scopes: ["https://poluspoc.onmicrosoft.com/api/user_impersonation"],
  usePopup: true,
  postLogoutRedirectUri: "http://localhost:3000/",
});

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById("root")
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
