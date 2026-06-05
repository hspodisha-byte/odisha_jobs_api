const express = require("express");
const cors = require("cors");
const app = express();

app.use(cors());
app.use(express.json());

const JOBS = [
  {id:"1",title:"Graphic Designer - Govt",org:"Odisha Handloom Dept",location:"Bhubaneswar, Odisha",src:"govt",srcLabel:"Government",type:"Full-time",field:"Graphic Design",odisha:true,verified:true,deadline:"2026-07-15",desc:"Design marketing materials for Odisha handloom products.",link:"#",aiFound:true},
  {id:"2",title:"Textile Design Faculty",org:"NIFT Bhubaneswar",location:"Bhubaneswar, Odisha",src:"edu",srcLabel:"University",type:"Full-time",field:"Textile Design",odisha:true,verified:true,deadline:"2026-06-30",desc:"Teach textile design to UG/PG students.",link:"#",aiFound:true},
  {id:"3",title:"UI/UX Designer",org:"Startup Odisha",location:"Cuttack, Odisha",src:"private",srcLabel:"Private Company",type:"Full-time",field:"UI/UX Design",odisha:true,verified:false,deadline:"Rolling",desc:"Design mobile app interfaces.",link:"#",aiFound:true}
];

app.post("/api/search", (req, res) => {
  res.json({
    jobs: JOBS,
    advice: "Live backend connected via Render!",
    sourcesSearched: ["data.gov.in", "Odisha Govt Portal"],
    searchTime: new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})
  });
});

app.get("/", (req, res) => { res.send("Odisha Jobs API is running!"); });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
