import React, { useState } from "react";
import { ReactComponent as Logo } from "./logo.svg";
import "./App.css";
import { BrowserRouter as Router, Switch, Route, NavLink } from "react-router-dom";
import authAzAdB2c from "./react-adb2c-helper";

function App() {
  const [userToken, setUserToken] = useState(null);

  const userLoggedUpdate = (newToken) => {
    if (newToken?.accessToken !== userToken?.accessToken) {
      setUserToken(newToken);
    }
  };
  authAzAdB2c.setUserTokenChangeHandler(userLoggedUpdate);

  return (
    <Router>
      <header className='App-nav'>
        <nav>
          <ul>
            <li>
              <NavLink exact={true} activeClassName='App-link-active' to='/'>
                Home
              </NavLink>
            </li>
            <li>
              <NavLink activeClassName='App-link-active' to='/about'>
                About
              </NavLink>
            </li>
            <li>
              <NavLink activeClassName='App-link-active' to='/profile'>
                {userToken ? "Profile" : "Sign In"}
              </NavLink>
            </li>
          </ul>
        </nav>
      </header>

      <div className='App'>
        <Switch>
          <Route path='/about'>
            <About />
          </Route>
          <Route
            path='/profile'
            component={authAzAdB2c.required(Users, () => (
              <div>User not logged in!</div>
            ))}
          />
          <Route path='/'>
            <Home />
          </Route>
        </Switch>
      </div>
    </Router>
  );
}

export default App;

function Home() {
  return (
    <>
      <h2>Home</h2>
      <p>Azure AD B2C React component DEMO</p>
      <p>Configure your AD B2C parameters in the index.js file</p>
    </>
  );
}

function About() {
  return (
    <>
      <h2>About</h2>
      <p>Author: Jorge Luna</p>
      <p>Date: March 2020</p>
      <p>MSAL.JS library : 1.2.2</p>
      <p>Ilusoft Inc. - Open Source Code</p>
    </>
  );
}

function Users(props) {
  const userToken = props.accessToken;
  return (
    <div>
      <h2>Users</h2>
      <h3>
        <Logo className='App-logo'></Logo>
      </h3>
      <ul className='App-user'>
        <li>Name :{` ${userToken?.idToken?.claims?.given_name} ${userToken?.idToken?.claims?.family_name}`}</li>
        <li>City : {userToken?.idToken?.claims?.city}</li>
        <li>Country : {userToken?.idToken?.claims?.country}</li>
      </ul>
      <button className='App-button' onClick={authAzAdB2c.signOut}>
        Logout
      </button>
    </div>
  );
}
