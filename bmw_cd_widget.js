let user = 'bmw_connected_drive_user_email'
let pwd = 'bmw_connected_drive_password'

token_expired = true
token = ""

mapbox_token = "pk.eyJ1IjoibGVvbnNjaGxvdGUiLCJhIjoiY2toM2czNXc0MDE1YTJ4czVmempwcTl1MiJ9.1Et2csv5Z49Gm5IL54Dmxw&"
let api_url = "https://b2vapi.bmwgroup.com/webapi/v1/user/vehicles"


const widget = new ListWidget()
await createWidget()


// used for debugging if script runs inside the app
if (!config.runsInWidget) {
  await widget.presentMedium()
}

Script.setWidget(widget)
Script.complete()




async function getToken(){
  if(token_expired){
      token_expired = false

      auth_url = "https://customer.bmwgroup.com/gcdm/oauth/token"
      headers = {
        "Content-Type": "application/x-www-form-urlencoded",
        "Host": "customer.bmwgroup.com",
        "Accept-Encoding": "gzip",
        "Authorization": "Basic ZDc2NmI1MzctYTY1NC00Y2JkLWEzZGMtMGNhNTY3MmQ3ZjhkOjE1ZjY5N2Y2LWE1ZDUtNGNhZC05OWQ5LTNhMTViYzdmMzk3Mw==",
        "User-Agent": "okhttp/3.12.2"
      }

      body = "scope=authenticate_user remote_services vehicle_data&grant_type=password&password="+pwd+"&username="+user

      const req = new Request(auth_url)
      req.headers = headers
      req.body = encodeURI(body)
      req.method = 'POST'

      let apiResult = await req.loadJSON()
      token_timer = Timer.schedule(apiResult.expires_in * 1000,false,()=>{
        token_expired = true
      })
      token = apiResult.access_token
    }
    return token

}


async function getVehicles(){
  url = api_url
  headers = {
    "Authorization": "Bearer " + await getToken()
  }

  const req = new Request(url)
  req.headers = headers

  let apiResult = await req.loadJSON()
  return apiResult.vehicles
}


async function getVehicleStatus(vin){

  url = api_url + "/"+vin+"/status"
  headers = {
    "Authorization": "Bearer " + await getToken()
  }

  const req = new Request(url)
  req.headers = headers
  let apiResult = await req.loadJSON()
  return apiResult.vehicleStatus
}

async function getVehicleImage(vin,width=500,height=400,angle=300, force_reload=false){
  let fm = FileManager.local()
  let dir = fm.documentsDirectory()
  let path = fm.joinPath(dir, vin+".png")
  if (!force_reload && fm.fileExists(path)) {
    return fm.readImage(path)
  } else {

    url = api_url + "/"+vin+"/image?width="+width+"&height="+height+"&angle="+angle
    headers = {
      "Authorization": "Bearer " + await getToken()
    }
    
    const req = new Request(url)
    req.headers = headers

    return await req.loadImage()
  }
}

async function getMapImage(lat,lon,heading=0,width=400,height=250){
    url = "https://api.mapbox.com/styles/v1/leonschlote/ckh3gavwd2n3519nkvfw1l0qe/static/"+lon+","+lat+",16,"+heading+"/"+height+"x"+width+"@2x?access_token="+mapbox_token
    const req = new Request(url)
    req.headers = headers
    return await req.loadImage()
}





async function createWidget(){

  let vehicles = await getVehicles()
  let vin = vehicles[0].vin

  let vehicleStatus = await getVehicleStatus(vin)


  let lockString = ""
  if (vehicleStatus.doorLockState=="SECURED"){
    lockString += "Verriegelt, "
  }else{
      lockString += "Entriegelt, "
  }

  if (vehicleStatus.trunk!="CLOSED"){
    lockString += "Kofferaum geöffnet, "
  }
  if (vehicleStatus.hood!="CLOSED"){
    lockString += "Motorhaube geöffnet, "
  }
  if (vehicleStatus.doorDriverFront!="CLOSED"){
    lockString += "Fahrertür geöffnet, "
  }
  if (vehicleStatus.doorPassengerFront!="CLOSED"){
    lockString += "Beifahrertür geöffnet, "
  }
  
  if (vehicleStatus.doorDriverRear != undefined && vehicleStatus.doorDriverRear!="CLOSED"){
    lockString += "Tür hinten links geöffnet, "
  }
  
  if (vehicleStatus.doorPassengerRear != undefined && vehicleStatus.doorPassengerRear!="CLOSED"){
    lockString += "Tür hinten rechts geöffnet, "
  }
  if(vehicleStatus.trunk == "CLOSED" &&
     vehicleStatus.hood == "CLOSED" &&
     vehicleStatus.doorDriverFront == "CLOSED" &&
     vehicleStatus.doorPassengerFront == "CLOSED" &&
     (vehicleStatus.doorDriverRear == undefined || vehicleStatus.doorDriverRear=="CLOSED") &&
     (vehicleStatus.doorPassengerRear == undefined || vehicleStatus.doorPassengerRear=="CLOSED")
   ){
     if(vehicleStatus.windowDriverFront == "CLOSED" &&
        vehicleStatus.windowPassengerFront == "CLOSED" &&
        (vehicleStatus.windowDriverRear == undefined || vehicleStatus.windowDriverRear=="CLOSED") &&
        (vehicleStatus.windowPassengerRear == undefined || vehicleStatus.windowPassengerRear=="CLOSED")
      ){
       lockString += "Alle Türen und Fenster geschlossen, "
     }else{
        lockString += "Alle Türen geschlossen, "
     }
   }

   if (vehicleStatus.windowDriverFront!="CLOSED"){
     lockString += "Fenster Fahrerseite vorne geöffnet, "
   }
   if (vehicleStatus.windowPassengerFront!="CLOSED"){
     lockString += "Fenster Beifahrerseite vorne geöffnet, "
   }
   if (vehicleStatus.windowDriverRear != undefined && vehicleStatus.windowDriverRear!="CLOSED"){
     lockString += "Fenster hinten links geöffnet, "
   }
   
   if (vehicleStatus.windowPassengerRear != undefined && vehicleStatus.windowPassengerRear!="CLOSED"){
     lockString += "Fenster hinten rechts geöffnet, "
   }

   lockString = lockString.slice(0,-2)

   let fuelString = ""

   if(vehicleStatus.fuelPercent != undefined){
     fuelString = vehicleStatus.fuelPercent+' % / '+vehicleStatus.remainingRangeFuel+' KM'
   }else{
     fuelString = vehicleStatus.remainingFuel+' L / '+vehicleStatus.remainingRangeFuel+' KM'
   }





  widget.backgroundColor = new Color('#ffffff', 1)
  widget.setPadding(0,0,0,0)

  const contentStack = widget.addStack()
  contentStack.layoutVertically()
  contentStack.topAlignContent()

  horizontalStack = contentStack.addStack()
  horizontalStack.layoutHorizontally()
  horizontalStack.topAlignContent()

  leftStack = horizontalStack.addStack()
  leftStack.layoutVertically()
  leftStack.topAlignContent()
  
  let vehicleImg = await getVehicleImage(vin,500,300,320)
  //let vehicleImg = await getVehicleImage(vin,500,200,320)
  car_stack = leftStack.addStack()
  car_stack.size = new Size(170,70)
  car_stack.backgroundImage = vehicleImg
  //car_img = leftStack.addImage(vehicleImg)

  textStack = leftStack.addStack()
  textStack.layoutVertically()
  textStack.topAlignContent()
  textStack.setPadding(2,12,0,0)
  
  textStackTitleSize = 8
  textStackValueSize = 10

  tankTitle = textStack.addText('Tankfüllstand')
  tankTitle.textColor = new Color('#666', 1)
  tankTitle.font = Font.mediumSystemFont(textStackTitleSize)

  tankValue = textStack.addText(fuelString)
  tankValue.textColor = new Color('#000', 1)
  tankValue.font = Font.boldSystemFont(textStackValueSize)

  textStack.addSpacer(4)

  mileageTitle = textStack.addText('Kilometerstand')
  mileageTitle.textColor = new Color('#666', 1)
  mileageTitle.font = Font.mediumSystemFont(textStackTitleSize)

  mileageValue = textStack.addText(vehicleStatus.mileage+' KM')
  mileageValue.textColor = new Color('#000', 1)
  mileageValue.font = Font.boldSystemFont(textStackValueSize)

  textStack.addSpacer(4)

  mpgTitle = textStack.addText('Verbrauch')
  mpgTitle.textColor = new Color('#666', 1)
  mpgTitle.font = Font.mediumSystemFont(textStackTitleSize)

  mpgValue = textStack.addText("ø "+(Math.round(vehicleStatus.remainingFuel / vehicleStatus.remainingRangeFuel * 10000)/100)+' L / 100KM')
  mpgValue.textColor = new Color('#000', 1)
  mpgValue.font = Font.boldSystemFont(textStackValueSize)

  textStack.addSpacer()

  rightStack = horizontalStack.addStack()
  rightStack.layoutVertically()
  rightStack.topAlignContent()
  rightStack.backgroundColor = new Color('#333',1)

  map_stack = rightStack.addStack()

  let mapImg = await getMapImage(vehicleStatus.position.lat, vehicleStatus.position.lon, vehicleStatus.position.heading)
  map_stack.backgroundImage = mapImg

  map_stack.addSpacer()
  map_stack_helper = map_stack.addStack()
  map_stack_helper.layoutVertically()
  map_stack_helper.addSpacer()

  locator_img = map_stack_helper.addImage(await getImage('locator.png'))
  locator_img.imageSize = new Size(80,80)

  map_stack_helper.addSpacer()
  map_stack.addSpacer()


  rightStack.addSpacer(2)
  lockedHelperStack = rightStack.addStack()
  lockedHelperStack.layoutHorizontally()

  lockedHelperStack.addSpacer(5)
  lockedHelperStack.addSpacer()

  lockedText = lockedHelperStack.addText(lockString)
  lockedText.centerAlignText()
  lockedText.textColor = new Color('#ccc', 1)
  lockedText.font = Font.mediumSystemFont(9)
  lockedText.lineLimit = 2

  lockedHelperStack.addSpacer()
  lockedHelperStack.addSpacer(5)

  rightStack.addSpacer(3)

}

// get images from local filestore or download them once
async function getImage(image) {
  let fm = FileManager.local()
  let dir = fm.documentsDirectory()
  let path = fm.joinPath(dir, image)
  if (fm.fileExists(path)) {
    return fm.readImage(path)
  } else {
    // download once
    let imageUrl
    switch (image) {
      case 'locator.png':
      imageUrl = "https://raw.githubusercontent.com/leonschlote/bmw_cd_widget/main/grey_locator.png"
      break
      default:
      console.log(`Sorry, couldn't find ${image}.`);
    }

    let iconImage = await loadImage(imageUrl)
    fm.writeImage(path, iconImage)
    return iconImage
  }
}

// helper function to download an image from a given url
async function loadImage(imgUrl) {
  const req = new Request(imgUrl)
  return await req.loadImage()
}
