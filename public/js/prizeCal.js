function prizeCal(itemPrize,thisEle) {
    var prize = thisEle.value*itemPrize;
    document.getElementById("prize").innerHTML = prize;
}