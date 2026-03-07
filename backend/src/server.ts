import { poolClient } from "./db";
import { app } from "./app";

const start = async() => {
    try{
        await poolClient.query("SELECT 1"); 
        console.log("Connected to PostgreSQL database");
        app.listen(3000, () => {
            console.log("Server is running on port 3000");
        });
    }catch(err){
        console.error(err);
    }
}
start();