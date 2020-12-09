require('./App.css');
const {BrowserRouter, Route, Switch} =  require("react-router-dom");
const {React, useState, useEffect} = require("react");

function App() {

    const [data, setData] = useState(null)

    useEffect(function () {

        try {
            (async () => {
                const response = await fetch(process.env.REACT_APP_BASE_URL + `/api`)
                setData((await response.json()).message)
            })()
        } catch (e) {
            console.log(e)
        }

    }, [])

    return (
        <div className="App">

            <div className={'App-header'}>


                <div>Current Branch: {process.env.REACT_APP_BRANCH || 'master'}</div>

                <div>Api Data: {data}</div>
                <div>Test</div>

                <div>
                    <a href={'about'}>About</a>
                </div>
                <div>
                    <a href={'contact'}>Contact</a>
                </div>

                <BrowserRouter>
                    <Switch>
                        <Route exact path="/" component={Home} />
                        <Route exact path="/about" component={About} />
                        <Route exact path="/contact" component={Contact} />
                    </Switch>
                </BrowserRouter>

            </div>

        </div>
    );
}

export default App;

const Home = props => {
    return <>Welcome</>
}

const About = props => {
    return <>About<div>Test About</div></>
}

const Contact = props => {
    return <>Contact<div>Test About</div></>
}
