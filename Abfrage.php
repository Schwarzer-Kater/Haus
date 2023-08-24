<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
  <head>
	<title>Abfrage wetter.db</title>
  </head>
  <style>
	table, th, td {
	border: 2px solid black;
	border-collapse: collapse;
	padding-left: 1em;
	padding-right: 1em;
	}

	thead {
	position: sticky;
	top: 0;
	color: black;
	background: white;
	}

	td {
		text-align: right;
	}

  </style>
  <body>
<?php
  $modifier = $_GET["modifier"];
?>
	<h1>Messwerte</h1>
	<table>
	  <caption>Messwerte</caption>
	  <thead>
		<tr><th>ID</th><th>Zeit</th><th>Temp. aussen</th><th>Luftfeuchte aussen</th><th>Luftdruck</th>
		  <th>Lichtwert</th><th>Temp. innen</th><th>Luftfeuchte innen</th><th>Temp. Garage</th></tr>
	  </thead>
<?php
 error_reporting(E_ALL);
 $db = new SQLite3("wetter.db");
 $query = "SELECT * FROM messwert";
 if ($modifier[0] == "-")
   $query = $query . " WHERE (SELECT datetime(zeit, 'unixepoch')) > (SELECT datetime('now', '" . $modifier . "'))";
 end	  
	  
 $res = $db->query($query);
	while($dsatz = $res->fetchArray(SQLITE3_ASSOC)){
    echo "<tr>";
	  echo "<td>";
	  echo $dsatz["id"];
      echo "</td>";
	  echo "<td>";
	  echo $dsatz["zeit"] . "<br>" . date("Y-m-d H:i:s (T)", $dsatz["zeit"]);
      echo "</td>";
	  echo "<td>";
	  echo $dsatz["temperaturAussen"];
      echo "</td>";
	  echo "<td>";
	  echo $dsatz["luftfeuchtigkeitAussen"];
      echo "</td>";
	  echo "<td>";
	  echo $dsatz["luftdruck"];
      echo "</td>";
	  echo "<td>";
	  echo $dsatz["lichtwert"];
      echo "</td>";
	  echo "<td>";
	  echo $dsatz["temperaturInnen"];
      echo "</td>";
	  echo "<td>";
	  echo $dsatz["luftfeuchtigkeitInnen"];
      echo "</td>";
	  echo "<td>";
	  echo $dsatz["temperaturGarage"];
      echo "</td>";
	
	echo "<tr>";
	}
	$db->close();
    echo "</table>";
	error_reporting(E_ALL);
	
	
	?>
</body>
</html>
