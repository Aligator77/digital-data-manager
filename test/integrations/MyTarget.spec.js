import assert from 'assert'
import sinon from 'sinon'
import reset from '../reset'
import MyTarget from '../../src/integrations/MyTarget'
import ddManager from '../../src/ddManager'

describe('Integrations: MyTarget', () => {
  let myTarget
  const options = {
    counterId: '123'
  }

  const multipleCounters = [
    {
      counterId: '123',
      listVar: {
        type: 'constant',
        value: '1'
      },
      feedWithGroupedProducts: true
    },
    {
      counterId: '456',
      listVar: {
        type: 'constant',
        value: '2'
      },
      feedWithGroupedProducts: false
    },
    {
      counterId: '789',
      listVar: {
        type: 'digitalData',
        value: 'website.myTargetList'
      },
      feedWithGroupedProducts: false
    }
  ]

  beforeEach(() => {
    window.digitalData = {
      website: {},
      page: {},
      user: {},
      events: []
    }
    myTarget = new MyTarget(window.digitalData, options)
    ddManager.addIntegration('MyTarget', myTarget)
  })

  afterEach(() => {
    myTarget.reset()
    ddManager.reset()
    reset()
  })

  describe('before loading', () => {
    beforeEach(() => {
      sinon.stub(myTarget, 'load')
    })

    afterEach(() => {
      myTarget.load.restore()
    })

    describe('#constructor', () => {
      it('should add proper tags and options', () => {
        assert.strict.equal(options.counterId, myTarget.getOption('counterId'))
        assert.strict.equal('script', myTarget.getTag().type)
        assert.strict.equal(myTarget.getTag().attr.src, '//top-fwz1.mail.ru/js/code.js')
      })

      it('should correctly set missing properties with defaults for multiple counters', () => {
        const multipleCountersOptions = {
          counters: [
            {
              counterId: '123',
              feedWithGroupedProducts: true
            },
            {
              counterId: '456',
              listVar: {
                type: 'constant',
                value: '2'
              }
            },
            {
              counterId: '789',
              listVar: {
                type: 'digitalData',
                value: 'website.myTargetList'
              }
            }
          ]
        }
        const myTargetWithMultipleCounters = new MyTarget(window.digitalData, multipleCountersOptions)
        const counters = myTargetWithMultipleCounters.getOption('counters')

        assert.strict.deepEqual(counters[0].listVar, { type: 'constant', value: '1' })
        assert.strict.equal(counters[1].feedWithGroupedProducts, false)
        assert.strict.equal(counters[2].feedWithGroupedProducts, false)
      })
    })

    describe('#initialize', () => {
      it('should initialize mytarget queue object', () => {
        ddManager.initialize()
        assert.ok(window._tmr)
        assert.ok(window._tmr.push)
      })

      it('should call tags load after initialization', () => {
        assert.ok(myTarget.load.notCalled)
        ddManager.initialize()
        assert.ok(myTarget.load.calledOnce)
      })
    })
  })

  describe('loading', () => {
    beforeEach(() => {
      sinon.stub(myTarget, 'load').callsFake(() => {
        window._tmr = {
          push () {
          },
          unload () {
          }
        }
        myTarget.onLoad()
      })
    })

    afterEach(() => {
      myTarget.load.restore()
    })

    it('should load', (done) => {
      assert.ok(!myTarget.isLoaded())
      myTarget.once('load', () => {
        assert.ok(myTarget.isLoaded())
        done()
      })
      ddManager.initialize()
    })
  })

  describe('after loading', () => {
    beforeEach((done) => {
      sinon.stub(myTarget, 'load').callsFake(() => {
        myTarget.onLoad()
      })
      ddManager.once('ready', done)
      ddManager.initialize()
    })

    afterEach(() => {
      myTarget.load.restore()
    })

    describe('#onViewedPage', () => {
      it('should not send pageView for "Viewed Page" event if not valid', (done) => {
        window.digitalData.events.push({
          name: 'Viewed Page',
          page: {},
          callback: () => {
            assert.strict.equal(window._tmr.length, 0)
            done()
          }
        })
      })

      it('should send pageView for every "Viewed Page" event', (done) => {
        window.digitalData.events.push({
          name: 'Viewed Page',
          page: {
            type: 'other'
          },
          callback: () => {
            setTimeout(() => {
              assert.strict.equal(window._tmr[0].id, myTarget.getOption('counterId'))
              assert.strict.equal(window._tmr[0].type, 'pageView')
              done()
            }, 101)
          }
        })
      })

      it('should not send pageView event if noConflict setting is true', (done) => {
        myTarget.setOption('noConflict', true)
        window.digitalData.events.push({
          name: 'Viewed Page',
          page: {
            type: 'home'
          },
          callback: () => {
            setTimeout(() => {
              assert.strict.equal(window._tmr.length, 0)
              done()
            }, 101)
          }
        })
      })

      it('should send pageView for every "Viewed Page" event and for multiple counters', (done) => {
        myTarget.setOption('counterId', '')
        myTarget.setOption('counters', multipleCounters)

        window.digitalData.events.push({
          name: 'Viewed Page',
          page: {
            type: 'other'
          },
          callback: () => {
            setTimeout(() => {
              assert.strict.equal(window._tmr.length, 6)
              assert.strict.equal(window._tmr[0].id, multipleCounters[0].counterId)
              assert.strict.equal(window._tmr[0].type, 'pageView')
              assert.strict.equal(window._tmr[1].id, multipleCounters[1].counterId)
              assert.strict.equal(window._tmr[1].type, 'pageView')
              assert.strict.equal(window._tmr[2].id, multipleCounters[2].counterId)
              assert.strict.equal(window._tmr[2].type, 'pageView')
              done()
            }, 101)
          }
        })
      })
    })

    describe('#onViewedHome', () => {
      it('should send viewHome event if user visits home page', (done) => {
        window.digitalData.events.push({
          name: 'Viewed Page',
          page: {
            type: 'home'
          },
          callback: () => {
            setTimeout(() => {
              assert.strict.equal(window._tmr.length, 2)
              assert.strict.deepEqual(window._tmr[1], {
                id: myTarget.getOption('counterId'),
                type: 'itemView',
                productid: '',
                pagetype: 'home',
                totalvalue: '',
                list: '1'
              })
              done()
            }, 101)
          }
        })
      })

      it('should send viewHome event if user visits home page (digitalData)', (done) => {
        window.digitalData.page = {
          type: 'home'
        }
        window.digitalData.events.push({
          name: 'Viewed Page',
          callback: () => {
            assert.strict.equal(window._tmr.length, 2)
            assert.strict.deepEqual(window._tmr[1], {
              id: myTarget.getOption('counterId'),
              type: 'itemView',
              productid: '',
              pagetype: 'home',
              totalvalue: '',
              list: '1'
            })
            done()
          }
        })
      })

      it('should send viewHome event with default list value', (done) => {
        window.digitalData.events.push({
          name: 'Viewed Page',
          page: {
            type: 'home'
          },
          callback: () => {
            assert.strict.equal(window._tmr.length, 2)
            assert.strict.equal(window._tmr[1].list, '1')
            done()
          }
        })
      })

      it('should send viewHome event using defined list value', (done) => {
        myTarget.setOption('listVar', {
          type: 'constant',
          value: '5'
        })
        window.digitalData.events.push({
          name: 'Viewed Page',
          page: {
            type: 'home'
          },
          callback: () => {
            assert.strict.equal(window._tmr.length, 2)
            assert.strict.equal(window._tmr[1].list, '5')
            done()
          }
        })
      })

      it('should send viewHome event using list value defined in digitalData', (done) => {
        window.digitalData.website = {
          myTargetList: '3'
        }
        myTarget.setOption('listVar', {
          type: 'digitalData',
          value: 'website.myTargetList'
        })
        window.digitalData.events.push({
          name: 'Viewed Page',
          page: {
            type: 'home'
          },
          callback: () => {
            assert.strict.equal(window._tmr.length, 2)
            assert.strict.equal(window._tmr[1].list, '3')
            done()
          }
        })
      })

      it('should send viewHome event with different list value for each counter', (done) => {
        myTarget.setOption('counterId', '')
        myTarget.setOption('counters', multipleCounters)

        window.digitalData.website = {
          myTargetList: '3'
        }

        window.digitalData.events.push({
          name: 'Viewed Page',
          page: {
            type: 'home'
          },
          callback: () => {
            assert.strict.equal(window._tmr.length, 6)
            assert.strict.equal(window._tmr[3].list, '1') // default value
            assert.strict.equal(window._tmr[4].list, '2') // constant value
            assert.strict.equal(window._tmr[5].list, '3') // digitalData value
            done()
          }
        })
      })
    })

    describe('#onViewedProductCategory', () => {
      it('should send itemView event for every "Viewed Product Category" event', (done) => {
        window.digitalData.events.push({
          name: 'Viewed Product Category',
          callback: () => {
            assert.strict.deepEqual(window._tmr[0], {
              id: myTarget.getOption('counterId'),
              type: 'itemView',
              productid: '',
              pagetype: 'category',
              totalvalue: '',
              list: '1'
            })
            done()
          }
        })
      })

      it('should not send itemView event if noConflict setting is true', (done) => {
        myTarget.setOption('noConflict', true)
        window.digitalData.events.push({
          name: 'Viewed Product Category',
          category: 'Content',
          callback: () => {
            assert.strict.equal(window._tmr.length, 0)
            done()
          }
        })
      })
    })

    describe('#onViewedProductDetail', () => {
      it('should send itemView event for every "Viewed Product Detail" event', (done) => {
        window.digitalData.events.push({
          name: 'Viewed Product Detail',
          category: 'Ecommerce',
          product: {
            id: '123',
            unitSalePrice: 150
          },
          callback: () => {
            assert.strict.deepEqual(window._tmr[0], {
              id: myTarget.getOption('counterId'),
              type: 'itemView',
              productid: '123',
              pagetype: 'product',
              totalvalue: 150,
              list: '1'
            })
            done()
          }
        })
      })

      it('should send itemView event with product SKU for every "Viewed Product Detail" event', (done) => {
        myTarget.setOption('feedWithGroupedProducts', true)
        window.digitalData.events.push({
          name: 'Viewed Product Detail',
          category: 'Ecommerce',
          product: {
            id: '123',
            skuCode: 'sku123',
            unitSalePrice: 150
          },
          callback: () => {
            assert.strict.deepEqual(window._tmr[0], {
              id: myTarget.getOption('counterId'),
              type: 'itemView',
              productid: 'sku123',
              pagetype: 'product',
              totalvalue: 150,
              list: '1'
            })
            done()
          }
        })
      })

      it('should send itemView event for every "Viewed Product Detail" event (digitalData)', (done) => {
        window.digitalData.product = {
          id: '123',
          unitSalePrice: 150
        }
        window.digitalData.events.push({
          name: 'Viewed Product Detail',
          callback: () => {
            assert.strict.deepEqual(window._tmr[0], {
              id: myTarget.getOption('counterId'),
              type: 'itemView',
              productid: '123',
              pagetype: 'product',
              totalvalue: 150,
              list: '1'
            })
            done()
          }
        })
      })

      it('should not send itemView event if noConflict option is true', (done) => {
        myTarget.setOption('noConflict', true)
        window.digitalData.events.push({
          name: 'Viewed Product Detail',
          category: 'Ecommerce',
          product: {
            id: '123'
          },
          callback: () => {
            assert.strict.equal(window._tmr.length, 0)
            done()
          }
        })
      })

      it('should send itemView event with product SKU or product id (depends on counter settings)', (done) => {
        myTarget.setOption('counterId', '')
        myTarget.setOption('counters', multipleCounters)

        window.digitalData.events.push({
          name: 'Viewed Product Detail',
          category: 'Ecommerce',
          product: {
            id: '123',
            skuCode: 'sku123',
            unitSalePrice: 150
          },
          callback: () => {
            assert.strict.equal(window._tmr[0].productid, 'sku123')
            assert.strict.equal(window._tmr[1].productid, '123')
            assert.strict.equal(window._tmr[2].productid, '123')
            done()
          }
        })
      })
    })

    describe('#onViewedCart', () => {
      const cart = {
        lineItems: [
          {
            product: {
              id: '123',
              unitSalePrice: 100
            },
            quantity: 1
          },
          {
            product: {
              id: '234',
              unitPrice: 100,
              unitSalePrice: 50
            },
            quantity: 2
          },
          {
            product: {
              id: '345',
              unitPrice: 30
            }
          },
          {
            product: {
              id: '456'
            }
          }
        ],
        total: 230
      }

      it('should send itemView event if user visits cart page (digitalData)', (done) => {
        window.digitalData.cart = cart
        window.digitalData.events.push({
          name: 'Viewed Cart',
          callback: () => {
            assert.strict.deepEqual(window._tmr[0], {
              id: myTarget.getOption('counterId'),
              type: 'itemView',
              productid: ['123', '234', '345', '456'],
              pagetype: 'cart',
              totalvalue: 230,
              list: '1'
            })
            done()
          }
        })
      })

      it('should not send itemView event if noConflict option is true', (done) => {
        myTarget.setOption('noConflict', true)
        window.digitalData.cart = cart
        window.digitalData.events.push({
          name: 'Viewed Page',
          page: {
            type: 'cart'
          },
          callback: () => {
            assert.strict.equal(window._tmr.length, 0)
            done()
          }
        })
      })
    })

    describe('#onCompletedTransaction', () => {
      const lineItems = [
        {
          product: {
            id: '123',
            unitSalePrice: 100
          },
          quantity: 1
        },
        {
          product: {
            id: '234',
            unitPrice: 100,
            unitSalePrice: 50
          },
          quantity: 2
        },
        {
          product: {
            id: '345',
            unitPrice: 30
          }
        },
        {
          product: {
            id: '456'
          }
        }
      ]

      it('should send itemView event if transaction is completed', (done) => {
        window.digitalData.events.push({
          name: 'Completed Transaction',
          transaction: {
            orderId: '123',
            isFirst: true,
            lineItems,
            total: 230
          },
          callback: () => {
            assert.strict.deepEqual(window._tmr[0], {
              id: myTarget.getOption('counterId'),
              type: 'itemView',
              productid: ['123', '234', '345', '456'],
              pagetype: 'purchase',
              totalvalue: 230,
              list: '1'
            })
            done()
          }
        })
      })

      it('should send itemView event if transaction is completed (digitalData)', (done) => {
        window.digitalData.transaction = {
          orderId: '123',
          isFirst: true,
          lineItems,
          total: 230
        }
        window.digitalData.events.push({
          name: 'Completed Transaction',
          callback: () => {
            assert.strict.deepEqual(window._tmr[0], {
              id: myTarget.getOption('counterId'),
              type: 'itemView',
              productid: ['123', '234', '345', '456'],
              pagetype: 'purchase',
              totalvalue: 230,
              list: '1'
            })
            done()
          }
        })
      })

      it('should not send trackTransaction event if noConflict option is true', (done) => {
        myTarget.setOption('noConflict', true)
        window.digitalData.events.push({
          name: 'Completed Transaction',
          category: 'Ecommerce',
          transaction: {
            orderId: '123',
            lineItems
          },
          callback: () => {
            assert.strict.equal(window._tmr.length, 0)
            done()
          }
        })
      })
    })

    describe('#onCustomEvent', () => {
      it('should send reachGoal event for any other DDL event', (done) => {
        myTarget.setOption('goals', {
          Subscribed: 'userSubscription'
        })
        myTarget.addGoalsToSemanticEvents()
        window.digitalData.events.push({
          name: 'Subscribed',
          user: {
            email: 'test@driveback.ru'
          },
          callback: () => {
            assert.strict.deepEqual(window._tmr[0], {
              id: myTarget.getOption('counterId'),
              type: 'reachGoal',
              goal: 'userSubscription'
            })
            done()
          }
        })
      })

      it('should send reachGoal event for sematic events if goal defined in settings', (done) => {
        myTarget.setOption('goals', {
          'Completed Transaction': 'orderCompleted'
        })
        myTarget.addGoalsToSemanticEvents()
        window.digitalData.events.push({
          name: 'Completed Transaction',
          transaction: {
            orderId: '123123',
            lineItems: [{
              product: {
                id: '123'
              }
            }],
            total: 1000
          },
          callback: () => {
            // window._tmr[0] has sematic event tracking
            assert.strict.deepEqual(window._tmr[1], {
              id: myTarget.getOption('counterId'),
              type: 'reachGoal',
              goal: 'orderCompleted'
            })
            done()
          }
        })
      })

      it('should not send reachGoal event if goal is not defined in settings', (done) => {
        myTarget.setOption('goals', {})
        myTarget.addGoalsToSemanticEvents()
        window.digitalData.events.push({
          name: 'Subscribed',
          user: {
            email: 'test@driveback.ru'
          },
          callback: () => {
            assert.strict.equal(window._tmr.length, 0)
            done()
          }
        })
      })

      it('should send reachGoal event for any other DDL event event if noConflict option is true', (done) => {
        myTarget.setOption('noConflict', true)
        myTarget.setOption('goals', {
          Subscribed: 'userSubscription'
        })
        myTarget.addGoalsToSemanticEvents()
        window.digitalData.events.push({
          name: 'Subscribed',
          user: {
            email: 'test@driveback.ru'
          },
          callback: () => {
            assert.strict.deepEqual(window._tmr[0], {
              id: myTarget.getOption('counterId'),
              type: 'reachGoal',
              goal: 'userSubscription'
            })
            done()
          }
        })
      })
    })
  })
})
