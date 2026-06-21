import axios from "axios";
import { useUser } from "./hooks/useUser";
import { supabase } from "./lib/supabase";

function App() {
  const { claims } = useUser();

  return (
    <div>
      {!claims && (
        <button
          onClick={async () => {
            await supabase.auth.signInWithWeb3({
              chain: "solana",
              statement: "I confirm I want to signin to predication market.",
            });
          }}
        >
          Signin with Solana
        </button>
      )}
      {claims && (
        <button
          onClick={async () => {
            await supabase.auth.signOut();
          }}
        >
          Logout
        </button>
      )}

      <button
        onClick={async () => {
          await supabase.auth.getSession().then(async (r) => {
            console.log(r.data.session?.access_token);
            axios.post(
              "http://localhost:3000/buy",
              {},
              {
                headers: {
                  Authorization: r.data.session?.access_token,
                },
              },
            );
          });
        }}
      >
        Click here to buy
      </button>
    </div>
  );
}

export default App;
