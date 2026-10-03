using System;
using System.IO;
using System.IO.Compression;
using System.Reflection;
using System.Diagnostics;
using System.Drawing;
using System.Windows.Forms;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;

namespace VenusModsSetup {
static class Program {
 public const string PayloadHash="36d0b741da1e521233fde008fac5c9f1833b505f7667bcf2387fd5ac3325d97c";
 public static string PackageRoot(string directory){return Path.Combine(directory,"Venus-Mods-Package");}
 public static string Home {get{return Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),"Programs","Maestro Community Mods","1.7.1");}}
 public static string Hash(byte[] bytes){using(var sha=SHA256.Create())return BitConverter.ToString(sha.ComputeHash(bytes)).Replace("-","").ToLowerInvariant();}
 public static void Extract(string directory){
  byte[] bytes;using(var input=Assembly.GetExecutingAssembly().GetManifestResourceStream("VenusModsPayload")){if(input==null)throw new Exception("Missing embedded package.");using(var memory=new MemoryStream()){input.CopyTo(memory);bytes=memory.ToArray();}}
  if(Hash(bytes)!=PayloadHash)throw new Exception("Embedded package verification failed.");
  string root=Path.GetFullPath(directory).TrimEnd(Path.DirectorySeparatorChar)+Path.DirectorySeparatorChar;
  using(var memory=new MemoryStream(bytes))using(var zip=new ZipArchive(memory,ZipArchiveMode.Read)){
   foreach(var entry in zip.Entries){string destination=Path.GetFullPath(Path.Combine(root,entry.FullName.Replace('/',Path.DirectorySeparatorChar)));if(!destination.StartsWith(root,StringComparison.OrdinalIgnoreCase))throw new Exception("Invalid package path.");if(entry.FullName.EndsWith("/")){Directory.CreateDirectory(destination);continue;}
    byte[] content;using(var input=entry.Open())using(var output=new MemoryStream()){input.CopyTo(output);content=output.ToArray();}
    Directory.CreateDirectory(Path.GetDirectoryName(destination));
    if(File.Exists(destination)){if(Hash(File.ReadAllBytes(destination))!=Hash(content))throw new Exception("An existing City Life setup file was edited: "+Path.GetFileName(destination)+". Keep that copy and choose a clean setup folder.");}
    else File.WriteAllBytes(destination,content);
   }
  }
 }
 public static string Quote(string text){if(text.Contains("\""))throw new Exception("Unsupported quote in file path.");return "\""+text.TrimEnd('\\')+"\"";}
 public static async Task<string> Run(string action,string folder,string directory,int selection){
  var info=new ProcessStartInfo("powershell.exe","-NoProfile -NonInteractive -ExecutionPolicy Bypass -File "+Quote(Path.Combine(PackageRoot(directory),"Installer.ps1"))+" -SelfTest -Action "+action+" -GameFolder "+Quote(folder)+" -Selection "+selection);info.UseShellExecute=false;info.CreateNoWindow=true;info.WindowStyle=ProcessWindowStyle.Hidden;info.RedirectStandardOutput=true;info.RedirectStandardError=true;
  using(var process=Process.Start(info)){var stdout=process.StandardOutput.ReadToEndAsync();var stderr=process.StandardError.ReadToEndAsync();await Task.Run(()=>process.WaitForExit());var output=await stdout;var error=await stderr;if(process.ExitCode!=0)throw new Exception(String.IsNullOrWhiteSpace(error)?output:error);return output.Trim();}
 }
 public static void Shortcut(string folder){
  string executable=Path.Combine(Home,"Maestro's Community Mods.exe");string own=Assembly.GetExecutingAssembly().Location;if(!String.Equals(own,executable,StringComparison.OrdinalIgnoreCase)){if(File.Exists(executable)){if(Hash(File.ReadAllBytes(executable))!=Hash(File.ReadAllBytes(own)))throw new Exception("Existing setup executable differs; shortcut was not replaced.");}else File.Copy(own,executable);}
  var type=Type.GetTypeFromProgID("WScript.Shell");object shell=Activator.CreateInstance(type);string link=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.StartMenu),"Programs","Maestro's Community Mods Manager.lnk");object shortcut=type.InvokeMember("CreateShortcut",BindingFlags.InvokeMethod,null,shell,new object[]{link});var t=shortcut.GetType();t.InvokeMember("TargetPath",BindingFlags.SetProperty,null,shortcut,new object[]{executable});t.InvokeMember("Arguments",BindingFlags.SetProperty,null,shortcut,new object[]{"--manage "+Quote(folder)});t.InvokeMember("Description",BindingFlags.SetProperty,null,shortcut,new object[]{"Manage or uninstall mods for Venus University"});t.InvokeMember("Save",BindingFlags.InvokeMethod,null,shortcut,null);
 }
 [STAThread] static int Main(string[] args){
  try{if(args.Length==2&&args[0]=="--verify"){Extract(args[1]);File.WriteAllText(Path.Combine(args[1],"setup-verification.txt"),"Embedded package SHA-256 verified; safe extraction completed.");return 0;}
   Application.EnableVisualStyles();Application.SetCompatibleTextRenderingDefault(false);
   
   var wizard=new Wizard();if(args.Length>0&&args[0]=="--manage")wizard.Manage(args.Length>1?args[1]:"");if(args.Length==2&&(args[0]=="--layout-test"||args[0]=="--layout-test-game")){if(args[0]=="--layout-test-game")wizard.ShowGamePage();wizard.Opacity=0;wizard.ShowInTaskbar=false;wizard.Show();Application.DoEvents();using(var bmp=new Bitmap(wizard.Width,wizard.Height)){wizard.DrawToBitmap(bmp,new Rectangle(0,0,wizard.Width,wizard.Height));bmp.Save(args[1]);}wizard.Close();return 0;}
   Application.Run(wizard);return 0;
  }catch(Exception e){if(args.Length>0&&args[0]=="--verify")File.WriteAllText(args[1]+"-error.txt",e.ToString());else MessageBox.Show(e.Message,"Maestro's Community Mods",MessageBoxButtons.OK,MessageBoxIcon.Error);return 1;}
 }
}
sealed class Wizard:Form {
 Panel body=new Panel();Button next=new Button(),back=new Button(),cancel=new Button();TextBox folder=new TextBox(),log=new TextBox();Button browse=new Button(),check=new Button();CheckBox shortcut=new CheckBox();int page=0;bool working=false,installed=false;Label title=new Label();
 Color plum=Color.FromArgb(43,28,47),rose=Color.FromArgb(224,165,189),ink=Color.FromArgb(69,42,60),paper=Color.FromArgb(252,246,237);
 Label step=new Label();CheckBox[] choices=new CheckBox[9];Button remove=new Button();int Selection{get{int result=0;for(int i=0;i<9;i++)if(choices[i].Checked)result|=1<<(i==8?9:i);return result;}}
 public Wizard(){Text="Maestro's Community Mods 1.7.1";ClientSize=new Size(900,620);FormBorderStyle=FormBorderStyle.FixedSingle;MaximizeBox=false;StartPosition=FormStartPosition.CenterScreen;AutoScaleMode=AutoScaleMode.None;Font=new Font("Segoe UI",10.5f);BackColor=paper;ForeColor=ink;
 var banner=new Panel();banner.SetBounds(0,0,900,130);banner.BackColor=plum;Controls.Add(banner);
 var brand=new Label();brand.Text="MAESTRO'S COMMUNITY MODS";brand.Font=new Font("Segoe UI",9,FontStyle.Bold);brand.ForeColor=rose;brand.SetBounds(32,18,650,24);banner.Controls.Add(brand);
 title.SetBounds(30,46,820,55);title.Font=new Font("Georgia",29,FontStyle.Bold);title.ForeColor=paper;banner.Controls.Add(title);
 step.SetBounds(32,101,800,22);step.Font=new Font("Segoe UI",9);step.ForeColor=rose;banner.Controls.Add(step);
 body.SetBounds(32,154,836,380);Controls.Add(body);
 var footer=new Panel();footer.BackColor=Color.FromArgb(242,230,225);footer.SetBounds(0,553,900,67);Controls.Add(footer);
 var note=new Label();note.Text="Mod issues: contact the mod maintainer, not the game author.";note.Font=new Font("Segoe UI",8,FontStyle.Bold);note.ForeColor=ink;note.SetBounds(32,8,475,20);footer.Controls.Add(note);var support=new LinkLabel();support.Text="Support the official release on Ko-fi";support.Font=new Font("Segoe UI",9,FontStyle.Bold);support.LinkColor=Color.FromArgb(151,48,83);support.ActiveLinkColor=Color.FromArgb(105,30,60);support.VisitedLinkColor=support.LinkColor;support.SetBounds(32,32,460,24);support.LinkClicked+=(o,e)=>{try{Process.Start(new ProcessStartInfo("https://ko-fi.com/venusdev"){UseShellExecute=true});}catch{MessageBox.Show("Visit https://ko-fi.com/venusdev to support the official release.","Support the developer");}};footer.Controls.Add(support);
 back.Text="Back";back.SetBounds(523,16,95,36);next.SetBounds(629,16,116,36);cancel.Text="Cancel";cancel.SetBounds(756,16,112,36);footer.Controls.Add(back);footer.Controls.Add(next);footer.Controls.Add(cancel);
 remove.Text="Uninstall mods";StyleButton(remove,false);remove.Click+=async(o,e)=>await Operation("uninstall");StyleButton(back,false);StyleButton(next,true);StyleButton(cancel,false);StyleButton(browse,false);StyleButton(check,false);
 back.Click+=(o,e)=>{page=0;Render();};next.Click+=Next;cancel.Click+=(o,e)=>Close();FormClosing+=(o,e)=>{if(working)e.Cancel=true;};Render();
 }
 void SyncDependencies(){if(choices[1]==null||choices[5]==null)return;if(!choices[1].Checked)choices[5].Checked=false;choices[5].Enabled=choices[1].Checked;}
 void StyleButton(Button button,bool primary){button.FlatStyle=FlatStyle.Flat;button.FlatAppearance.BorderSize=primary?0:1;button.FlatAppearance.BorderColor=Color.FromArgb(191,157,173);button.BackColor=primary?Color.FromArgb(151,48,83):paper;button.ForeColor=primary?Color.White:ink;button.Font=new Font("Segoe UI",10,FontStyle.Bold);button.Cursor=Cursors.Hand;button.FlatAppearance.MouseOverBackColor=primary?Color.FromArgb(175,63,101):Color.FromArgb(237,218,222);}
 Label Label(string text,int y,int height){var label=new Label();label.UseMnemonic=false;label.Text=text;label.SetBounds(0,y,836,height);body.Controls.Add(label);return label;}
 void Render(){body.Controls.Clear();back.Enabled=page==1&&!working;cancel.Text=installed?"Close":"Cancel";
 if(page==0){title.Text="Your story. Your mods.";step.Text="01  /  WELCOME";
 var heading=Label("Make it your kind of game.",0,45);heading.Font=new Font("Georgia",17,FontStyle.Bold);heading.Width=630;
 string[] names={"Story && Social core","City Life locations","Custom soundtrack","Meanwhile conversations","Playthrough renaming","City Life jobs","Starting relationships","Plot Twist","Breakthrough"};
 string[] details={"Journals, text regeneration and SQLite memory.","Bowling, roller skating and cat cafe backgrounds/map.","Replace individual music tracks and control looping.","Watch two NPCs talk without joining the scene.","Change the labels of your saved playthroughs.","Player/NPC employment. Requires City Life locations.","Choose an ex or a character who starts out disliking you.","Add or edit story direction during a playthrough.","Earn spirit and unleash a powerful positive story moment."};
 for(int i=0;i<9;i++){if(choices[i]==null){choices[i]=new CheckBox();choices[i].Checked=true;choices[i].CheckedChanged+=(o,e)=>SyncDependencies();}int[] left={0,8,1,5,2,3};int[] right={4,6,7};int col=Array.IndexOf(left,i)>=0?0:1,row=col==0?Array.IndexOf(left,i):Array.IndexOf(right,i);int spacing=col==0?48:57;var c=choices[i];c.Text=names[i];c.Font=new Font("Segoe UI",10.5f,FontStyle.Bold);c.SetBounds(col*425,48+row*spacing,411,26);body.Controls.Add(c);var description=new Label();description.UseMnemonic=false;description.Text=details[i];description.SetBounds(col*425,76+row*spacing,404,24);description.Font=new Font("Segoe UI",8.5f);body.Controls.Add(description);
 }

 SyncDependencies();
 var requirement=Label("For game 0.3.0 only. Test preview. Core story features remain bundled.",345,32);requirement.Font=new Font("Segoe UI",9,FontStyle.Bold);
  next.Text="Let's begin";
 }else{title.Text=installed?"Welcome to the neighborhood.":"Point to the folder";step.Text=installed?"03  /  READY TO PLAY":"02  /  INSTALL YOUR MODS";
 Label("Save and close the game first. Point to the folder containing Venus University.exe.\r\nKeep a save backup; setup backs up the game archive automatically.",0,55);
 var field=Label("GAME FOLDER",68,23);field.Font=new Font("Segoe UI",9,FontStyle.Bold);
 folder.SetBounds(0,96,703,30);folder.BorderStyle=BorderStyle.FixedSingle;folder.BackColor=Color.White;folder.ForeColor=ink;body.Controls.Add(folder);browse.Text="Browse...";browse.SetBounds(715,91,121,38);body.Controls.Add(browse);browse.Click-=Browse;browse.Click+=Browse;
 check.Text="Check compatibility";check.SetBounds(0,145,221,38);remove.SetBounds(235,145,170,38);body.Controls.Add(remove);body.Controls.Add(check);check.Click-=Check;check.Click+=Check;
 shortcut.Text="Add Start Menu shortcut for managing or uninstalling the mod";shortcut.SetBounds(0,195,836,30);if(!installed)shortcut.Checked=true;body.Controls.Add(shortcut);
 log.Multiline=true;log.ReadOnly=true;log.ScrollBars=ScrollBars.Vertical;log.BorderStyle=BorderStyle.FixedSingle;log.BackColor=Color.FromArgb(243,232,230);log.ForeColor=ink;log.Font=new Font("Segoe UI",10);log.SetBounds(0,241,836,132);body.Controls.Add(log);next.Text=installed?"Finish":"Install";folder.Enabled=!installed;browse.Enabled=!installed;check.Enabled=!installed;shortcut.Enabled=!installed;
 }
 }
 public void Manage(string path){folder.Text=path;ShowGamePage();}
 public void ShowGamePage(){page=1;Render();}
 void Browse(object sender,EventArgs e){using(var dialog=new FolderBrowserDialog()){dialog.Description="Point to the folder containing Venus University.exe and resources.";if(dialog.ShowDialog(this)==DialogResult.OK)folder.Text=dialog.SelectedPath;}}
 async void Check(object sender,EventArgs e){await Operation("check");}
 async void Next(object sender,EventArgs e){if(page==0){page=1;Render();return;}if(installed){Close();return;}await Operation("install");}
 async Task Operation(string action){working=true;remove.Enabled=false;next.Enabled=false;back.Enabled=false;cancel.Enabled=false;browse.Enabled=false;check.Enabled=false;folder.Enabled=false;log.Text="Checking files... Please wait.";
  try{if(action!="uninstall"&&Selection==0)throw new Exception("Select at least one mod on the welcome page.");if(String.IsNullOrWhiteSpace(folder.Text)||!File.Exists(Path.Combine(folder.Text,"resources","app.asar")))throw new Exception("Choose the game folder containing resources/app.asar.");await Task.Run(()=>Program.Extract(Program.Home));string output=await Program.Run(action,folder.Text,Program.Home,Selection);log.Text=output;if(action=="uninstall"){installed=false;Render();log.Text=output;}if(action=="install"){installed=true;string shortcutStatus="";if(shortcut.Checked){try{Program.Shortcut(folder.Text);shortcutStatus="\r\nThe Start Menu manager can uninstall the mod.";}catch(Exception e){shortcutStatus="\r\nMod installed; shortcut could not be created: "+e.Message;}}Render();log.Text=output+"\r\n\r\nLaunch your normal game executable."+shortcutStatus;}}
  catch(Exception e){log.Text="Unable to complete setup.\r\n"+e.Message;}
  finally{working=false;remove.Enabled=true;next.Enabled=true;cancel.Enabled=true;back.Enabled=!installed;browse.Enabled=!installed;check.Enabled=!installed;folder.Enabled=!installed;}
 }
}
}








