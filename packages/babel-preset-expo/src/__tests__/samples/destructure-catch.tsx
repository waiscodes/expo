function App() {
  const foo = () => {
    try {
      console.log('hey');
    } catch ({ message }) {
      // NOTE(EvanBacon): React compiler throws:
      // (BuildHIR::lowerAssignment) Could not find binding for declaration.
      console.error(message);
    }
  };
  return <div>Hello</div>;
}
