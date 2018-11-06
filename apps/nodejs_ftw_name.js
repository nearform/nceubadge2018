// Animated Nametag with Rockets and Turtles.

var rocket = Graphics.createImage(
  "#####\n" +
    "###########\n" +
    "################\n" +
    "####################\n" +
    "#######################\n" +
    " #########################\n" +
    " ############################\n" +
    " ##############################\n" +
    "  ############       ############\n" +
    "  ##########    ###    ############\n" +
    "   ########   #######    ############\n" +
    "    #######   ########   ##############\n" +
    "    #######    #######   ###############\n" +
    "     ########    ##    ##################\n" +
    "      #########       ##################### #######\n" +
    "       ##################################### ##########\n" +
    "        #################### ################ ##########\n" +
    "         #################     ############### #########\n" +
    "           ############## ###    #############  #########\n" +
    "            #############  ### ## #############  ########\n" +
    "              ############  ##  ##  ############ #########\n" +
    "               ############ ####  ## ###########  ########\n" +
    "                 ###########  ####  #  #########   #######\n" +
    "                #  ###########  #### ##  ##               #\n" +
    "               ###  ############  ###  #  ######\n" +
    "               #####  ############  ###    ########\n" +
    "               #######  ###########  ###   ##########\n" +
    "               ##########  ######  ##  # ##############\n" +
    "              #############  ##  ##################\n" +
    "               ###############   #################\n" +
    "                  ############   ############  ####\n" +
    "                     #########    ####   #####   ###\n" +
    "                        #####     ###      ###\n" +
    "                           ##                ##"
);

var turtle = Graphics.createImage(
  "                                            *******\n" +
    "                                        ..M.. .    :M.      \n" +
    "                     .. .              .M.            M.    \n" +
    "               ~MM.  ..  .+M~.        .M..           .,+.   \n" +
    "            87.M+ MN... :MM ..M..     M                ~M.  \n" +
    "          D     .MM: .. ..7M.M.:M.  .             MN     M  \n" +
    "        .M         .M7,..      M M.  N           .,:      M \n" +
    "      .$,          8 M.         M M  M.                  .M \n" +
    "      N~.          M.O           M.M 8.         .         M \n" +
    "     .,.M.        ::  .          ? MZ M       .OM=M      ,$ \n" +
    "   . M:M. MZ... ..M M..       +M..7.M. M.       MM,     .I  \n" +
    "   .M.   MM?..MMMM   MN7?8MMM DMM M  M M        .+,. ..M.   \n" +
    "    N.      . =MM:.....   .MM.. .M+. .MM        . :MM,      \n" +
    "  .M.     ..M.?     ....N.M      .MM  .M     ~MZ            \n" +
    " .OM~     .O M          N.M        M..M.M.  ~  .            \n" +
    ".MMMMM7.  .M..          I.M        M M  M   M.              \n" +
    ",.   .M IMO. ...        ~.M ... OM. .M.M  . N               \n" +
    "MM.  ..M  ... M$ .     .M.MMM.,MMMMM.MM.  .M                \n" +
    ".M M. .M M?...MM ....  =.   .M..   .8M    .O.               \n" +
    " .8. 8M=N..    .M~.MM   . MO?. ..=M7    . M                 \n" +
    "   .M. ..MMN .. .M?I.    . M?MM7..      .N.                 \n" +
    "   ..D$.   .. . 7NDDDO$~.. ...         .M.                  \n" +
    "     ..$M                               .,                  \n" +
    "          M.        ....    .  .        .Z.                 \n" +
    "          ~        +. .....  ...         .M                 \n" +
    "          =.       O.         .M.       .$                  \n" +
    "         .?M..    .M.         ..M . . +MN.                  \n" +
    "            . ~~$Z..            ... . ."
);

Badge.apps["Node.js FTW Name"] = () => {
  Badge.reset();
  var rocketWidth = 60;
  var initialRocketPosition = 40 + rocketWidth;
  var rocketPos = initialRocketPosition;
  var initialTurtlePosition = -60;
  var turtlePos = initialTurtlePosition;
  var onFrame = () => {
    g.clear();

    // Draw Turtle
    g.drawImage(turtle, turtlePos++, 0);
    if (turtlePos > 130) {
      turtlePos = initialTurtlePosition;
    }

    // Draw Rocket
    g.drawImage(rocket, --rocketPos, --rocketPos);
    if (rocketPos < -rocketWidth) {
      rocketPos = initialRocketPosition;
    }

    // Draw Name
    g.setFontVector(15);
    var name = Badge.NAME.join(" ");
    g.drawString(name, 0, 44);
    g.setFontVector(10);

    g.flip();
  };

  setInterval(onFrame, 75);

  setWatch(Badge.menu, BTN1);
};
