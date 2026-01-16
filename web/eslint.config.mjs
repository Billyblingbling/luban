import nextCoreWebVitals from "eslint-config-next/core-web-vitals"

const config = [
  {
    ignores: [".next/**", "out/**", "node_modules/**", "playwright-report/**", "test-results/**"],
  },
  ...nextCoreWebVitals,
  {
    rules: {
      "react-hooks/refs": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
]

export default config

