import { PanelApp } from './panel/PanelApp'
import { PetCanvas } from './pet/PetCanvas'

function App() {
  const search = new URLSearchParams(window.location.search)
  const panel = search.get('panel')

  if (panel) {
    return <PanelApp />
  }

  return <PetCanvas />
}

export default App
