require('./App.css');
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

            </div>

        </div>
    );
}

export default App;
