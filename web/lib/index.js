import 'styles/app.scss';
import '@babel/polyfill';

import { render } from 'react-dom';
import * as React from 'react';
import App from 'components/App';

render(React.createElement(App), document.getElementById('content'));
