import React, { useState, useEffect } from "react";
import { Roboto } from 'next/font/google';

const roboto_light = Roboto( {
    weight: '300',
    subsets: ['latin']
})

const Login = ({ onLogin, unauthorized, onLogout }) => {

    const pageData = () => {
        if (unauthorized) {
            return {
                title: 'Unauthorized',
                body: 'You are logged in to an account without access. Please log out and log back in with a HuBMAP Consortium Registered Account',
                cb: onLogout,
                btn: 'Log Out'
            }
        } else {
            return {
                title: 'HuBMAP Data Ingest Board',
                body: 'User authentication is required to view the Dataset Publishing Dashboard. Please click the button below and you will be redirected to a login page. There you can login with your institution credentials. Thank you!',
                cb: onLogin,
                btn: 'Log in with your institution credentials'
            }
        }
    }
    const details = pageData()
    return (
        <div>
            <div className="container">
                <div className="c-login row">
                    <h1 className="c-login__head col-6">{details.title}</h1>
                    <p className={`c-login__txt ${roboto_light.className}`}>
                        {details.body}
                    </p>
                    <div className="row">
                        <button className="c-login__btn col-4" onClick={details.cb}>
                            {details.btn}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login