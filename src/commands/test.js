const joi = require('joi')
const puppeteer = require('puppeteer')
const { getOptions } = require('../utils/options')
const { compareNewScreenshotsToRefScreenshots } = require('../utils/image')
const { getPreviews, takeNewScreenshotsOfPreviews } = require('../utils/page')
const { debug, spinner } = require('../utils/debug')

const testSchema = joi
  .object()
  .unknown()
  .keys({
    url: joi.string().required(),
    dir: joi.string(),
    filter: joi.array().items(joi.string()),
    reject: joi.array().items(joi.string()),
    threshold: joi
      .number()
      .min(0)
      .max(1),
    viewports: joi.object().pattern(
      /^.+$/,
      joi.object().keys({
        width: joi
          .number()
          .integer()
          .min(1),
        height: joi
          .number()
          .integer()
          .min(1),
        deviceScaleFactor: joi
          .number()
          .integer()
          .min(1),
        isMobile: joi.boolean(),
        hasTouch: joi.boolean(),
        isLandscape: joi.boolean()
      })
    ),
    launchOptions: joi.object(),
    navigationOptions: joi.object()
  })

const testDefaults = {
  url: undefined,
  sandbox: true,
  dir: 'styleguide-visual',
  filter: undefined,
  threshold: 0.001,
  viewports: {
    desktop: {
      width: 800,
      height: 600,
      deviceScaleFactor: 1
    }
  },
  launchOptions: {},
  navigationOptions: {}
}

async function test (partialOptions) {
  let browser

  try {
    const options = await getOptions(partialOptions, testDefaults, testSchema)
    const { url, dir, filter, threshold, viewports, launchOptions, navigationOptions } = options

    browser = await puppeteer.launch(launchOptions)
    const page = await browser.newPage()

    for (const viewport of Object.keys(viewports)) {
      const viewportSpinner = spinner(`Taking screenshots for viewport ${viewport}`).start()
      await page.setViewport(viewports[viewport])
      const previews = await getPreviews(page, { url, filter, viewport, navigationOptions })
      await takeNewScreenshotsOfPreviews(page, previews, { dir, navigationOptions })
      viewportSpinner.stop()
    }

    await compareNewScreenshotsToRefScreenshots({ dir, filter, threshold })
  } catch (err) {
    debug(err)
    throw err
  } finally {
    if (browser != null) {
      await browser.close()
    }
  }
}

module.exports = test
