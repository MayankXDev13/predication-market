import { useSupabase } from "./hooks/useSupabase";
import { useUser } from "./hooks/useUser";

function App() {


  const {claims} = useUser()
  const supabase = useSupabase()

  return (



    <div>
      {!claims && <button onClick={async () => {
        await supabase.auth.signInWithWeb3({
          chain: 'solana',
          statement: 'I confirm I want to signin to predication market.',
        })
      }}>Signin with Solana</button>
      }
      {claims && <button onClick={async () => {
        await supabase.auth.signOut()
      }}>Logout</button>}


      {JSON.stringify(claims)}

    </div>
  );
}

export default App;
