import { OcgTestComponent } from '@/components/duel/ocg-test'

export default function OcgTestPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">OCG Core WASM Test</h1>
      <p className="text-muted-foreground mb-8">
        This page tests the integration of the EDOPro/ygopro-core rules engine 
        compiled to WebAssembly. This enables accurate Yu-Gi-Oh! game simulation 
        with full effect resolution directly in the browser.
      </p>
      <OcgTestComponent />
    </div>
  )
}
