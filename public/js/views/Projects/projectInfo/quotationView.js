define([
    'text!templates/Projects/projectInfo/quotations/quotationTemplate.html',
    'text!templates/Projects/projectInfo/quotations/ListTemplate.html',
    'text!templates/stages.html',
    'views/salesQuotation/EditView',
    'views/salesQuotation/list/ListView',
    'views/Projects/projectInfo/quotations/CreateView',
    'models/QuotationModel',
    'common',
    'helpers',
    'dataService'

], function (quotationTopBar, ListTemplate, stagesTemplate, editView, listView, quotationCreateView, currentModel, common, helpers, dataService) {
    var quotationView = listView.extend({

        el            : '#quotations',
        templateHeader: _.template(quotationTopBar),
        templateList  : _.template(ListTemplate),

        events: {
            "click .checkbox"                    : "checked",
            "click #createQuotation"             : "createQuotation",
            "click #removeQuotation"             : "removeItems",
            "click  .list tbody td:not(.notForm)": "goToEditDialog",
            "click .stageSelect"                 : "showNewSelect"
        },

        initialize: function (options) {
            this.collection = options.collection;
            this.projectID = options.projectId;
            this.customerId = options.customerId;
            this.projectManager = options.projectManager;
        },

        chooseOption: function (e) {
            var self = this;
            var target$ = $(e.target);
            var targetElement = target$.closest("tr");
            var parentTd = target$.closest("td");
            var a = parentTd.find("a");
            var id = targetElement.attr("data-id");
            var model = this.collection.get(id);

            model.save({
                workflow: {
                    _id: target$.attr("id"),
                    name:target$.text()
                }}, {
                headers : {
                    mid: 55
                },
                patch   : true,
                validate: false,
                success : function () {
                    a.text(target$.text())
                }
            });

            this.hideNewSelect();
            return false;
        },


        goToEditDialog: function (e) {
            e.preventDefault();
            var self = this;

            var id = $(e.target).closest("tr").attr("data-id");
            var model = new currentModel({validate: false});
            var modelQuot = this.collection.get(id);

            model.urlRoot = '/quotation/form/' + id;
            model.fetch({
                success: function (model) {
                    new editView({model: model, redirect: true, pId: self.projectID, customerId: self.customerId});


                    self.collection.remove(id);
                    self.renderProformRevenue(modelQuot);
                    self.render();
                },
                error  : function () {
                    alert('Please refresh browser');
                }
            });
        },

        renderProformRevenue: function (modelQuot) {
            var proformContainer = $('#proformRevenueContainer');
            var modelJSON = modelQuot.toJSON();

            var orderSum = proformContainer.find('#orderSum');
            var orderCount = proformContainer.find('#orderCount');
            var order = parseFloat(orderSum.attr('data-value'));
            var totalSum = proformContainer.find('#totalSum');
            var totalCount = proformContainer.find('#totalCount');
            var total = parseFloat(orderSum.attr('data-value'));
            var newTotal = total + modelJSON.paymentInfo.total;
            var newOrder = order + modelJSON.paymentInfo.total;

            orderSum.attr('data-value', newOrder);
            orderSum.text(helpers.currencySplitter(newOrder.toFixed(2)));

            totalSum.attr('data-value', newTotal);
            totalSum.text(helpers.currencySplitter(newTotal.toFixed(2)));

            orderCount.text(parseFloat(orderCount.text()) + 1);
            totalCount.text(parseFloat(totalCount.text()) + 1);
        },

        removeItems: function (event) {
            event.preventDefault();

            var answer = confirm("Realy DELETE items ?!");

            var that = this;
            var mid = 39;
            var model;
            var localCounter = 0;
            var listTableCheckedInput;
            var count;
            var table = $("#quotationTable")

            listTableCheckedInput = table.find("input:not('#check_all_quotations'):checked");
            count = listTableCheckedInput.length;
            this.collectionLength = this.collection.length;

            if (answer == true) {
                $.each(listTableCheckedInput, function (index, checkbox) {
                    model = that.collection.get(checkbox.value);
                    model.destroy({
                        headers: {
                            mid: mid
                        },
                        wait   : true,
                        success: function (model) {
                            var id = model.get('_id');

                            table.find('[data-id="' + id + '"]').remove();

                            //that.deleteItemsRender(that.deleteCounter, that.deletePage);
                        },
                        error  : function (model, res) {
                            if (res.status === 403 && index === 0) {
                                alert("You do not have permission to perform this action");
                            }
                            that.listLength--;
                            count--;
                            if (count === 0) {
                                that.deleteCounter = localCounter;
                                that.deletePage = $("#currentShowPage").val();
                                that.deleteItemsRender(that.deleteCounter, that.deletePage);
                            }
                        }
                    });
                });
            }

        },

        checked: function (e) {
            if (this.collection.length > 0) {
                var checkLength = $("input.checkbox:checked").length;

                if ($("input.checkbox:checked").length > 0) {
                    $("#removeQuotation").show();
                    $('#check_all_quotations').prop('checked', false);

                    if (checkLength == this.collection.length) {
                        $('#check_all_quotations').prop('checked', true);
                    }
                }
                else {
                    $("#removeQuotation").hide();
                    $('#check_all_quotations').prop('checked', false);
                }
            }
        },

        createQuotation: function (e) {
            e.preventDefault();
            new quotationCreateView({
                projectId     : this.projectID,
                customerId    : this.customerId,
                collection    : this.collection,
                projectManager: this.projectManager
            });
        },

        render: function () {
            var currentEl = this.$el;
            var self = this;

            currentEl.html('');
            currentEl.prepend(this.templateHeader);

            currentEl.find('#listTableQuotation').html(this.templateList({
                quotations : this.collection.toJSON(),
                startNumber: 0,
                dateToLocal: common.utcDateToLocaleDate
            }));

            this.$el.find('#removeQuotation').hide();

            $('#check_all_quotations').click(function () {
                $(':checkbox').prop('checked', this.checked);
                if ($("input.checkbox:checked").length > 0) {
                    $("#removeQuotation").show();
                } else {
                    $("#removeQuotation").hide();
                }
            });

            dataService.getData("/workflow/fetch", {
                wId         : 'Purchase Order',
                source      : 'purchase',
                targetSource: 'quotation'
            }, function (stages) {
                self.stages = stages;
            });
        }


    });

    return quotationView;
});