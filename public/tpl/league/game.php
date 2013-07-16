<?php
use Destiny\Common\Utils\Date;
use Destiny\Common\Utils\Http;
use Destiny\Common\Utils\Lol;
use Destiny\Common\Utils\Tpl;
use Destiny\Common\Session;
use Destiny\Common\UserRole;
use Destiny\Common\Config;
?>
<!DOCTYPE html>
<html>
<head>
<title><?=Tpl::title($model->title)?></title>
<meta charset="utf-8">
<?include'./tpl/seg/opengraph.php'?>
<?include'./tpl/seg/commontop.php'?>
<?include'./tpl/seg/google.tracker.php'?>
</head>
<body id="game" class="league">
	<?include'./tpl/seg/top.php'?>
	
	<?if(!Session::hasRole(UserRole::USER)):?>
	<?include'./tpl/seg/fantasy/calltoaction.php'?>
	<?endif;?>
	
	<?if(Session::hasRole(UserRole::USER)):?>
	<?include'./tpl/seg/fantasy/teambar.php'?>
	<?include'./tpl/seg/fantasy/teammaker.php'?>
	<?endif;?>
	
	<section class="container">
	
		<?php include'./tpl/seg/fantasy/fantasysubnav.php' ?>
		
		<h3>
			<?=($model->game['gameType']!='NONE') ? Lol::$gameTypes[$model->game['gameType']]:'Custom Game'?>
			<small><?=Tpl::moment(Date::getDateTime($model->game['gameCreatedDate']),Date::STRING_FORMAT)?></small>
		</h3>
		<div id="activeGame" data-gameid="<?=$model->game['gameId']?>" class="game-vertical clearfix" style="margin-top:0; position: relative; border:none;">
			<div style="width:50%; float:left;">
				<div class="clearfix game-team-blue">
					<h4><?=($model->game['gameWinSideId']==Lol::TEAMSIDE_BLUE) ? 'Winning side':'Losing side'?></h4>
					<div class="pull-left">
					<?php foreach ($model->game['champions'] as $bSummoner): ?>
					<?php if($bSummoner['teamSideId'] == Lol::TEAMSIDE_BLUE): ?>
						<a class="champion" href="http://www.lolking.net/summoner/na/<?=$bSummoner['summonerId']?>" title="<?=Tpl::out($bSummoner['championName'])?>">
							<img style="width: 45px; height: 45px;" src="<?=Config::cdn()?>/web/img/64x64.gif" data-src="<?=Lol::getIcon($bSummoner['championName'])?>" />
							<?=Tpl::out($bSummoner['summonerName'])?>
						</a>
					<?php endif; ?>
					<?php endforeach; ?>
					</div>
				</div>
			</div>
			<div style="width:50%; float:right;">
				<div class="clearfix game-team-purple">
					<h4><?=($model->game['gameWinSideId']==Lol::TEAMSIDE_PURPLE) ? 'Winning side':'Losing side'?></h4>
					<div class="pull-right">
					<?php foreach ($model->game['champions'] as $pSummoner): ?>
					<?php if($pSummoner['teamSideId'] == Lol::TEAMSIDE_PURPLE): ?>
						<a class="champion" href="http://www.lolking.net/summoner/na/<?=$pSummoner['summonerId']?>" title="<?=Tpl::out($pSummoner['championName'])?>">
							<?=Tpl::out($pSummoner['summonerName'])?>
							<img style="width: 45px; height: 45px;" src="<?=Config::cdn()?>/web/img/64x64.gif" data-src="<?=Lol::getIcon($pSummoner['championName'])?>" />
						</a>
					<?php endif; ?>
					<?php endforeach; ?>
					</div>
				</div>
			</div>
		</div>
	</section>
		
	
	<section class="container">
		<div class="content content-dark stream-grids clearfix">
			<div class="stream stream-grid" style="width:100%;">
				<table class="grid">
					<thead>
						<tr>
							<td style="width: 100%;">Your points</td>
							<td></td>
						</tr>
					</thead>
					<tbody>
					<?php foreach($model->teamChampionScores as $champScore): ?>
					<tr>
						<td style="text-align: left;">
							<span style="color: green;">+<?=$champScore['scoreValue']?></span> <small class="subtle">points earned</small>
						</td>
						<td style="text-align: right;">
							<img title="<?=Tpl::out($champScore['championName'])?>" style="width: 20px; height: 20px;" src="<?=Config::cdn()?>/web/img/64x64.gif" data-src="<?=Lol::getIcon($champScore['championName'])?>" />
							<small><?=$champScore['penalty']?></small> <small class="subtle">penalty</small>
							<small><?=$champScore['championMultiplier']?></small> <small class="subtle">multiplier</small>
						</td>
					</tr>
					<?php endforeach; ?>
					<?for($s=0;$s<1-(($model->teamChampionScores) ? count($model->teamChampionScores):0);$s++):?>
					<tr>
						<td style="text-align: left;"><span class="subtle">No champion points earned this match</span></td>
						<td style="text-align: right;"></td>
					</tr>
					<?endfor;?>
					
					<?php foreach($model->teamGameScores as $gameScore): ?>
					<tr>
						<td style="text-align: left;">
							<span style="color: green;">+<?=intval($gameScore['scoreValue'])?></span> <small class="subtle">points earned</small>
						</td>
						<td style="text-align: right;"><small class="subtle"><?=Tpl::out(strtolower($gameScore['scoreType']))?></small></td>
					</tr>
					<?php endforeach; ?>
					
					</tbody>
				</table>
			</div>
		</div>
	</section>
	
		
	<section class="container">
		<div class="content content-dark stream-grids clearfix">
			<div class="stream stream-grid" style="width:100%">
				<table class="grid">
					<thead>
						<tr>
							<td style="width: 100%">Match leaders</td>
							<td style="text-align: right;"></td>
							<td style="text-align: right;"></td>
						</tr>
					</thead>
					<tbody>
						<?php if(!empty($model->gameLeaderboard)): ?>
						<?foreach($model->gameLeaderboard as $rank=>$topTeam):?>
						<?$title = Tpl::out($topTeam['username'])?>
						<tr>
							<td style="text-align: left;">
								<?=Tpl::flag($topTeam['country'])?>
								<?=Tpl::subIcon($topTeam['subscriber'])?>
								<?=$title?>
							</td>
							<td style="text-align: right;"><?=Tpl::n($topTeam['sumScore'])?></td>
							<td style="text-align: right;">
								<div class="team-champions" style="width:<?=(25*Config::$a['fantasy']['team']['maxChampions'])?>px;">
								<?$champions = $topTeam['champions'];?>
								<?foreach($champions as $champion):?>
								<div class="thumbnail">
									<img title="<?=Tpl::out($champion['championName'])?>" style="width: 25px; height: 25px;" src="<?=Config::cdn()?>/web/img/64x64.gif" data-src="<?=Lol::getIcon($champion['championName'])?>" />
								</div>
								<?endforeach;?>
								<?for($i=0;$i<Config::$a['fantasy']['team']['maxChampions']-intval(count($champions));$i++):?>
								<div class="thumbnail">
									<img style="width: 25px; height: 25px;" src="<?=Config::cdn()?>/web/img/64x64.gif" />
								</div>
								<?endfor;?>
							</div>
							</td>
						</tr>
						<?endforeach;?>
						<?endif;?>
						<?for($s=0;$s<10-count($model->gameLeaderboard);$s++):?>
						<tr>
							<td style="text-align: left;"><i class="icon-minus td-fill"></i></td>
							<td style="text-align: right;">&nbsp;</td>
							<td style="text-align: right;">&nbsp;</td>
						</tr>
						<?endfor;?>
					</tbody>
				</table>
			</div>
			
		</div>
	</section>
	
	<?include'./tpl/seg/panel.ads.php'?>
	<?include'./tpl/seg/foot.php'?>
	<?include'./tpl/seg/commonbottom.php'?>
</body>
</html>