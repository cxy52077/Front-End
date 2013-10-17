(function(window) {
    window.ViewModel = function(options) {
        var self = this;
        var defaults = {
            defaultSortBy: "desc",
            defaultSortFields: "KeyID",
            pageIndex: 1,
            isInitData: false,
            pageSize: 20,
            parameter: {}
        };


        if ($("#divProcessLoading").html() == null) {
            var loading = $("<div id=\"divProcessLoading\" />").attr("class", "loading hide").appendTo('body');

            var img = $("<img />").attr("src", "/img/loading.gif").appendTo(loading);

            var loadContent = $("<span />").html("数据加载中").appendTo(loading);
        }

        var opts = $.extend({}, defaults, options);

        var dataSource = opts.dataSource;

        var dataCount = opts.dataCount;

        // 存储数据
        self.dataList = ko.observableArray();

        // 页索引
        self.pageIndex = ko.observable(opts.pageIndex);

        self.defaultSortBy = ko.observable(opts.defaultSortBy);

        self.isDesc = ko.observable(true); // 降序

        // 当前操作行
        self.selectItem = ko.observable();

        // 查询连接
        self.dataQueryUrl = opts.dataQueryUrl;

        // 页数
        self.pageNumbers = ko.observable();

        // 排序字段
        self.sortField = ko.observable(opts.sortField);

        // 总记录数
        self.totalCount = ko.observable();

        // 总页数
        self.totalPages = ko.dependentObservable(function() {
            if (self.totalCount() > 0) {
                return (self.totalCount() % opts.pageSize) > 0 ? (Math.ceil(self.totalCount() / opts.pageSize)) : (self.totalCount() / opts.pageSize);
            }

        });


        // 请求参数 
        opts.requestParameters = {
            pageSize: opts.pageSize, // 可为空
            sortField: opts.defaultSortFields, // 排序字段(默认降序)
            pageIndex: self.pageIndex(),
            sortBy: opts.defaultSortBy
        };

        // 初始化数据参数
        var dataParameters = $.extend({}, opts.parameter, opts.requestParameters);

        // 判断是否为Json对象
        var isJson = function(obj) {
            var isjson = typeof (obj) == "object" && Object.prototype.toString.call(obj).toLowerCase() == "[object object]" && !obj.length;
            return isjson;
        }

        // 操作方法
        self.methods = {

            // 所有页数
            allPages: ko.dependentObservable(function() {
                var pages = [];
                for (i = 0; i < self.totalPages(); i++) {
                    pages.push({ pageNumber: (i + 1) });
                }

                return pages;
            }),

            // 翻页操作
            moveToPage: function(index) {
                self.pageIndex(index);
                dataParameters = $.extend({}, dataParameters, { pageIndex: self.pageIndex() });
                $.ajax({
                    url: self.dataQueryUrl,
                    type: 'get',
                    data: dataParameters,
                    beforeSend: function() {
                        new $.ShowDiv({ divID: "divProcessLoading" }).show();
                    },
                    success: function(result) {
                        if (!isJson(result)) {
                            result = $.parseJSON(result);
                        }
                        self.dataList(result[dataSource]);
                        self.totalCount(result[dataCount]);

                    },
                    complete: function() {
                        new $.ShowDiv({ divID: "divProcessLoading" }).close();
                    },
                    error: function(err) {
                        alert("数据加载错误");
                    }
                });
            },

            // 查询操作
            query: function() {
                self.pageIndex(1);
                self.sortField(opts.sortField);
                self.defaultSortBy(opts.defaultSortBy);
                dataParameters = $.extend({}, dataParameters, { pageIndex: 1 }, { sortField: self.sortField() }, { sortBy: self.defaultSortBy() });

                $.ajax({
                    url: self.dataQueryUrl,
                    type: 'get',
                    data: dataParameters,
                    beforeSend: function() {
                        new $.ShowDiv({ divID: "divProcessLoading" }).show();
                    },
                    success: function(result) {
                        if (result.indexOf("错误信息") >= 0) {
                            alert(result);
                            return false;
                        }
                        if (!isJson(result)) {
                            result = $.parseJSON(result);
                        }


                        self.dataList(result[dataSource]);
                        self.totalCount(result[dataCount]);
                        //  self.methods.bindPager();

                    },
                    complete: function() {
                        new $.ShowDiv({ divID: "divProcessLoading" }).close();
                    },
                    error: function(err) {
                        alert("数据加载错误");
                    }
                });

            },

            // 清空搜索
            reset: function() {

            },

            // 排序操作
            sort: function(sortField) {
                self.sortField(sortField);
                self.isDesc(!self.isDesc());
                var sortBy = self.isDesc() ? "desc" : "asc";
                self.defaultSortBy(sortBy);
                self.pageIndex(1);
                dataParameters = $.extend({}, dataParameters, { pageIndex: 1 }, { sortField: self.sortField() }, { sortBy: self.defaultSortBy() });
                $.ajax({
                    url: self.dataQueryUrl,
                    type: 'get',
                    data: dataParameters,
                    success: function(result) {
                        if (!isJson(result)) {
                            result = $.parseJSON(result);
                        }

                        self.dataList(result[dataSource]);
                        self.totalCount(result[dataCount]);
                    },
                    error: function(err) {
                        alert("数据加载错误");
                    }
                });
            },

            // 绑定排序
            bindSort: function() {
                var rowField = $("#tableList thead tr").eq(0).find('th');
                $(rowField).each(function() {
                    var item = $(this);
                    var field = item.attr("sortField");
                    if (field != null) {
                        item.attr("data-bind", "click:function(){ methods.sort('" + field + "');}");
                        item.css("cursor", "pointer")
                        item.css("text-decoration", "underline")
                    }

                })

            },

            // 绑定分页
            bindPager: function() {
                var $divPager = $("#divPagination");
                if ($divPager === null || typeof $divPager === "undefined") {
                    return false;
                }

                if (self.totalCount() == 0) {
                    return false;
                }
                var strPager = " <div class=\"pagination\">";
                strPager += " <ul>";
                strPager += "<li data-bind=\"css:{disabled:pageIndex()==1}\"><a href=\"javascript:;\" data-bind=\"click:function(){methods.moveToPage(pageIndex()>1?(pageIndex()-1):1)}\">上一页</a></li>";
                strPager += "</ul>";
                strPager += "<ul data-bind=\"foreach:methods.allPages()\">";
                strPager += "  <li data-bind=\"css: {active: pageNumber ==$parent.pageIndex()}\"><a href=\"javascript:;\" data-bind=\"text:$data.pageNumber, click:function(){$parent.methods.moveToPage($data.pageNumber)}\"></a></li>";
                strPager += "</ul>";

                strPager += " <ul>";
                strPager += "<li data-bind=\"css:{disabled:pageIndex()== totalPages()}, click:function(){methods.moveToPage(totalPages()<(pageIndex()+1)?totalPages():(pageIndex()+1))}\"> <a href=\"javascript:;\">下一页</a></li>";
                strPager += "</ul>";
                strPager += "</div>";
                $divPager.html(strPager);
                $divPager.attr("class", " pagination text-center");
            }
        };

        // 是否默认显示查询数据
        if (opts.isInitData) {
            self.methods.query();
        }

        self.methods.bindPager();
        // 绑定排序
        //   self.methods.bindSort();

        // 绑定分页
        //   self.methods.bindPager();

    }

})(window);
