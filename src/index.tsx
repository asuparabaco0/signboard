import React from 'react'
import ReactDOM from 'react-dom'
import { GlobalStyle } from './GlobalStyle'
//*=>import all constant in a specify file as color
import {App} from './App'
ReactDOM.render(
  <>
    <GlobalStyle />
    <App />
  </>,
  document.getElementById('app'),
)
