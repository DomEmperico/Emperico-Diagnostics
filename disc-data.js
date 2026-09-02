/* Emperico Working-Style Module — shared DISC-style item bank (v2, 20 blocks).
   Public-domain four-factor model; original Emperico item wording. */

const DISC_STYLES = {
  D: { name: "Direct", gives: "Pace, clarity and a willingness to decide when others hesitate.", watch: "Can steamroll the room, or mistake speed for the right answer.", coach: "the people, culture and succession gaps tend to respond to patience, not force of will." },
  I: { name: "Influencing", gives: "Energy, persuasion and a knack for bringing people with you.", watch: "Can overpromise, or let follow-through slip once the excitement fades.", coach: "the step up is from being liked to being trusted with the hard calls." },
  S: { name: "Steady", gives: "Consistency, calm under pressure and genuine reliability.", watch: "Can avoid necessary conflict, or let change outpace their comfort.", coach: "the step up is from being dependable to being decisive when it matters." },
  C: { name: "Conscientious", gives: "Rigour, accuracy and decisions grounded in evidence.", watch: "Can get stuck analysing, or hold the room back waiting for certainty.", coach: "the step up is from being right to being followed." }
};

const DISC_BLOCKS = [
  { id:1, prompt:"When facing a tight deadline, I tend to…", options:[
    {style:"D", text:"take charge and drive the pace"},
    {style:"I", text:"rally the team and keep spirits up"},
    {style:"S", text:"steady everyone with a calm, consistent approach"},
    {style:"C", text:"double-check the detail before pushing ahead"} ]},
  { id:2, prompt:"In a disagreement with a colleague, I tend to…", options:[
    {style:"D", text:"state my position directly and push for resolution"},
    {style:"I", text:"look for a way to smooth things over quickly"},
    {style:"S", text:"wait for the right moment and avoid escalation"},
    {style:"C", text:"lay out the facts and let logic decide"} ]},
  { id:3, prompt:"When starting a new piece of work, I tend to…", options:[
    {style:"D", text:"set the direction and get moving fast"},
    {style:"I", text:"generate ideas and get others excited"},
    {style:"S", text:"plan steadily, building from what's worked before"},
    {style:"C", text:"map out the detail before committing"} ]},
  { id:4, prompt:"Under real pressure, I tend to…", options:[
    {style:"D", text:"push harder and take control"},
    {style:"I", text:"talk it through with others"},
    {style:"S", text:"stay calm and keep things steady"},
    {style:"C", text:"focus in and get more precise"} ]},
  { id:5, prompt:"When giving someone feedback, I tend to…", options:[
    {style:"D", text:"get straight to the point"},
    {style:"I", text:"frame it positively and encouragingly"},
    {style:"S", text:"deliver it gently, mindful of feelings"},
    {style:"C", text:"back it up with specific evidence"} ]},
  { id:6, prompt:"In meetings, I tend to…", options:[
    {style:"D", text:"drive the room toward a decision"},
    {style:"I", text:"keep energy and engagement up"},
    {style:"S", text:"make sure everyone's actually been heard"},
    {style:"C", text:"keep things accurate and on track"} ]},
  { id:7, prompt:"When faced with change, I tend to…", options:[
    {style:"D", text:"push it through quickly"},
    {style:"I", text:"sell the upside to others"},
    {style:"S", text:"want time to adjust to it steadily"},
    {style:"C", text:"want to understand it fully first"} ]},
  { id:8, prompt:"My natural strength is best described as…", options:[
    {style:"D", text:"getting results"},
    {style:"I", text:"building relationships"},
    {style:"S", text:"creating consistency"},
    {style:"C", text:"ensuring accuracy"} ]},
  { id:9, prompt:"Colleagues would most likely describe me as…", options:[
    {style:"D", text:"decisive"},
    {style:"I", text:"enthusiastic"},
    {style:"S", text:"dependable"},
    {style:"C", text:"thorough"} ]},
  { id:10, prompt:"When a plan stops working, I tend to…", options:[
    {style:"D", text:"change course immediately"},
    {style:"I", text:"talk to people to find a new way forward"},
    {style:"S", text:"adjust gradually rather than abruptly"},
    {style:"C", text:"analyse what went wrong before changing anything"} ]},
  { id:11, prompt:"In a genuine crisis, I tend to…", options:[
    {style:"D", text:"take control and act fast"},
    {style:"I", text:"keep morale up"},
    {style:"S", text:"provide a steadying presence"},
    {style:"C", text:"think through the risks carefully"} ]},
  { id:12, prompt:"When delegating, I tend to…", options:[
    {style:"D", text:"hand over the goal and let people run with it"},
    {style:"I", text:"involve people and get their buy-in"},
    {style:"S", text:"delegate steadily, checking in along the way"},
    {style:"C", text:"delegate with clear, detailed instructions"} ]},
  { id:13, prompt:"My biggest risk under stress is…", options:[
    {style:"D", text:"coming across as too blunt or controlling"},
    {style:"I", text:"overpromising, or losing focus on detail"},
    {style:"S", text:"avoiding a confrontation that's actually needed"},
    {style:"C", text:"getting stuck in analysis and slowing things down"} ]},
  { id:14, prompt:"When persuading others, I mostly rely on…", options:[
    {style:"D", text:"confidence and conviction"},
    {style:"I", text:"charisma and storytelling"},
    {style:"S", text:"trust built over time"},
    {style:"C", text:"logic and evidence"} ]},
  { id:15, prompt:"In social situations at work, I tend to…", options:[
    {style:"D", text:"get to business quickly"},
    {style:"I", text:"enjoy connecting with everyone in the room"},
    {style:"S", text:"prefer smaller, familiar groups"},
    {style:"C", text:"observe before joining in"} ]},
  { id:16, prompt:"When something goes wrong, I tend to…", options:[
    {style:"D", text:"act quickly to fix it"},
    {style:"I", text:"reassure people it'll be fine"},
    {style:"S", text:"stay calm and support those affected"},
    {style:"C", text:"work out exactly what went wrong"} ]},
  { id:17, prompt:"I generally make decisions…", options:[
    {style:"D", text:"quickly and with conviction"},
    {style:"I", text:"by talking them through with others"},
    {style:"S", text:"carefully, once I've had time to think"},
    {style:"C", text:"only once I've gathered enough information"} ]},
  { id:18, prompt:"My pace of work is best described as…", options:[
    {style:"D", text:"fast — I like to move quickly"},
    {style:"I", text:"energetic, but variable"},
    {style:"S", text:"steady and consistent"},
    {style:"C", text:"measured and careful"} ]},
  { id:19, prompt:"When I disagree with a decision that's been made, I tend to…", options:[
    {style:"D", text:"challenge it directly"},
    {style:"I", text:"raise it informally, in conversation"},
    {style:"S", text:"go along with it to keep the peace"},
    {style:"C", text:"put my concerns in writing, with reasoning"} ]},
  { id:20, prompt:"What matters most to me at work is…", options:[
    {style:"D", text:"achieving results"},
    {style:"I", text:"connecting with people and being appreciated"},
    {style:"S", text:"stability and harmony"},
    {style:"C", text:"getting things right"} ]}
];

// Deterministic per-block rotation of option order so the same style
// doesn't always sit in the same column (prevents pattern-answering).
function discRotatedOptions(block){
  const order = ["D","I","S","C"];
  const shift = block.id % 4;
  const rotated = order.slice(shift).concat(order.slice(0, shift));
  return rotated.map(s => block.options.find(o => o.style === s));
}
