param([switch]$RunPreviewAcceptance)
$ErrorActionPreference='Stop'
if(-not $RunPreviewAcceptance){throw 'Explicit -RunPreviewAcceptance required: creates and removes synthetic accounts in opencourts-dev only.'}
$previewOrigin='https://feature-play-together.opencourts.pages.dev'
$accountId='0f71d46e637d75b35ce799d1e90559b3'
$devDatabaseId='cae4849c-3e99-4945-9d70-bef7b48707ce'
$authText=Get-Content "$env:APPDATA/xdg.config/.wrangler/config/default.toml" -Raw
$oauthToken=[regex]::Match($authText,'oauth_token\s*=\s*"([^"]+)"').Groups[1].Value
$cfHeaders=@{Authorization="Bearer $oauthToken"}
$project=(Invoke-RestMethod "https://api.cloudflare.com/client/v4/accounts/$accountId/pages/projects/opencourts" -Headers $cfHeaders).result
if($project.deployment_configs.preview.d1_databases.COURTS_DB.id -ne $devDatabaseId){throw 'Preview D1 is not isolated; stopping.'}
function QueryDev([string]$Sql,[object[]]$Values=@()){
 $body=@{sql=$Sql;params=@($Values)}|ConvertTo-Json -Depth 10 -Compress
 $result=Invoke-RestMethod "https://api.cloudflare.com/client/v4/accounts/$accountId/d1/database/$devDatabaseId/query" -Method Post -Headers $cfHeaders -ContentType 'application/json' -Body $body
 if(-not $result.success){throw 'Development query failed.'};return $result.result[0].results
}
function Check([bool]$Pass,[string]$Message){if(-not $Pass){throw $Message}}
$qaSessions=@{};$qaIds=@{};$qaGroups=[System.Collections.Generic.List[string]]::new();$qaChecks=0
function Api([string]$Who,[string]$Path,[string]$Method='GET',$Body=$null,[int]$Expected=200){
 $args=@{Uri=$previewOrigin+'/api/'+$Path;Method=$Method;UseBasicParsing=$true;WebSession=$qaSessions[$Who];Headers=@{Origin=$previewOrigin;'X-CSRF-Token'='synthetic-qa-csrf'}}
 if($null -ne $Body){$args.ContentType='application/json';$args.Body=$Body|ConvertTo-Json -Depth 10 -Compress}
 try{$r=Invoke-WebRequest @args;$status=[int]$r.StatusCode;$content=$r.Content}catch{if(-not $_.Exception.Response){throw};$status=[int]$_.Exception.Response.StatusCode;$content='{}'}
 Check ($status -eq $Expected) "Unexpected status $status for $Method $Path (expected $Expected)";$script:qaChecks++;if($content){return $content|ConvertFrom-Json}
}
try{
 $now=[DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
 foreach($who in @('host','player','outsider')){
  $id=[guid]::NewGuid().ToString();$qaIds[$who]=$id;$token=([guid]::NewGuid().ToString('N')+[guid]::NewGuid().ToString('N'))
  $sha=[Security.Cryptography.SHA256]::Create();try{$hash=([BitConverter]::ToString($sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($token)))).Replace('-','').ToLowerInvariant()}finally{$sha.Dispose()}
  $null=QueryDev 'INSERT INTO players(id,display_name,discoverable,created_at,updated_at) VALUES (?,?,1,?,?)' @($id,"Synthetic Preview QA $who",$now,$now)
  $null=QueryDev 'INSERT INTO auth_sessions(id,player_id,token_hash,csrf_token,created_at,expires_at) VALUES (?,?,?,?,?,?)' @([guid]::NewGuid().ToString(),$id,$hash,'synthetic-qa-csrf',$now,($now+1800000))
  $webSession=New-Object Microsoft.PowerShell.Commands.WebRequestSession
  $cookie=New-Object Net.Cookie('__Host-oc_session',$token,'/','feature-play-together.opencourts.pages.dev');$cookie.Secure=$true;$cookie.HttpOnly=$true;$webSession.Cookies.Add($cookie);$qaSessions[$who]=$webSession
 }
 $group=(Api host 'groups' POST @{name='Synthetic Preview QA Tennis';publicDescription='Temporary development acceptance fixture';description='QA PRIVATE SENTINEL';generalLocation='Synthetic location';skillPreference='any';visibility='private';requestId=[guid]::NewGuid().ToString()} 201).id;$qaGroups.Add($group)
 $null=Api player "groups/$group/request" POST @{}
 $null=Api host "groups/$group/approve" POST @{playerId=$qaIds.player}
 $fixtureGames=@{}
 foreach($visibility in @('group','unlisted')){
  $game=[guid]::NewGuid().ToString();$fixtureGames[$visibility]=$game;$groupValue=if($visibility -eq 'group'){$group}else{$null};$policy=if($visibility -eq 'group'){'instant'}else{'approval'}
  $null=QueryDev 'INSERT INTO games(id,organizer_id,visibility,group_id,title,court_id,court_name,court_lat,court_lon,court_access,starts_at,ends_at,time_zone,format,capacity,skill_preference,notes,request_id,request_hash,created_at,updated_at,join_policy) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)' @($game,$qaIds.host,$visibility,$groupValue,'Synthetic QA game','synthetic-qa-court','Synthetic QA Court',38,-77,'public',($now+86400000),($now+90000000),'UTC','doubles',4,'any','Temporary development fixture',[guid]::NewGuid().ToString(),'qa',$now,$now,$policy)
  $null=QueryDev 'INSERT INTO game_participants(game_id,player_id,joined_at) VALUES (?,?,?)' @($game,$qaIds.host,$now)
 }
 $game=$fixtureGames.group
 $null=Api outsider "games/$game" GET $null 404
 $null=Api player "games/$game/join" POST @{}
 $null=Api player "games/$game/request-guests" POST @{guestCount=1}
 $null=Api host "games/$game/approve-guests" POST @{playerId=$qaIds.player}
 Check ((Api player "games/$game").game.playerCount -eq 3) 'Host + player + guest must occupy three places.'
 Check ((Api host 'games/notifications').notifications.kind -contains 'guest_requested') 'Host guest notification missing.'
 Check ((Api player 'games/notifications').notifications.kind -contains 'guest_approved') 'Player approval notification missing.'
 $null=Api player "games/$game/cancel-guests" POST @{}
 Check ((Api player "games/$game").game.playerCount -eq 2) 'Guest cancellation must retain member place.'
 $null=Api player "games/$game/leave" POST @{reason='Synthetic acceptance complete'}
 Check ((Api host "games/$game").game.playerCount -eq 1) 'Leaving must release place.'
 $unlisted=$fixtureGames.unlisted
 $null=Api player "games/$unlisted" GET $null 404
 $invite=Api host "games/$unlisted/share-links" POST @{expiresInDays=1} 201
 $null=Api player 'games/invitation-accept' POST @{token=$invite.url.Split('#')[1]}
 $null=Api player "games/$unlisted" GET
 $null=Api host "games/$unlisted/revoke-link" POST @{linkId=$invite.id}
 $null=Api player "games/$unlisted" GET $null 404
 $null=Api player 'players/report' POST @{subjectType='group';subjectId=$group;category='other';details='Synthetic preview acceptance report'} 201
 $null=Api player 'players/reports' GET $null 403
 $null=Api host 'players/block' POST @{playerId=$qaIds.player}
 Check (-not ((Api host 'players?q=Synthetic').players.id -contains $qaIds.player)) 'Blocked player remained discoverable.'
 $null=Api host "groups/$group/remove" POST @{playerId=$qaIds.player}
 $null=Api player "games/$game" GET $null 404
 Write-Output "Preview acceptance passed: $qaChecks live API checks; synthetic group/guest/link/block/report workflows."
}finally{
 if($qaIds.host){$null=QueryDev 'DELETE FROM games WHERE organizer_id=?' @($qaIds.host)}
 foreach($group in $qaGroups){$null=QueryDev 'DELETE FROM tennis_groups WHERE id=? AND owner_id=?' @($group,$qaIds.host)}
 foreach($id in $qaIds.Values){$null=QueryDev 'DELETE FROM players WHERE id=?' @($id)}
 Write-Output 'Synthetic QA accounts, groups, games, sessions and related records removed from development D1.'
}
